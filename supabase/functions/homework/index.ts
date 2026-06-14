import { checkRateLimit } from './rate_limit.js'

const ADMIN_ROLES = new Set(['admin', 'master', 'coach'])
const HOMEWORK_BUCKET = 'homework-submissions'
const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
])
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.doc', '.docx'])

Deno.serve(async (req) => {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
  const { getCorsHeaders, isOriginAllowed, corsResponse, handleOptions } = await import('../cors.ts')

  const origin = req.headers.get('origin')
  if (!isOriginAllowed(origin)) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const corsHeaders = getCorsHeaders(origin)
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseKey) {
    return corsResponse({ error: 'Server configuration error' }, 500, origin)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  const rateLimitResult = await checkRateLimit(ip, 'homework')

  if (!rateLimitResult.allowed) {
    return new Response(JSON.stringify({
      error: 'Rate limit exceeded',
      retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
    }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  function base64UrlDecode(input: string) {
    const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - input.length % 4) % 4)
    const binary = atob(padded)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
  }

  function base64UrlEncode(input: Uint8Array) {
    let binary = ''
    input.forEach((byte) => { binary += String.fromCharCode(byte) })
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
  }

  async function signPortalToken(payload: Record<string, unknown>) {
    const secret = portalSecret()
    const header = { alg: 'HS256', typ: 'JWT' }
    const encodedHeader = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)))
    const encodedPayload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)))
    const signingInput = `${encodedHeader}.${encodedPayload}`
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput))
    return `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`
  }

  function portalSecret() {
    return Deno.env.get('PORTAL_AUTH_SECRET') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'dev-portal-auth-secret'
  }

  function safeEqual(a: string, b: string) {
    const aa = new TextEncoder().encode(a)
    const bb = new TextEncoder().encode(b)
    if (aa.length !== bb.length) return false
    let diff = 0
    for (let i = 0; i < aa.length; i++) diff |= aa[i] ^ bb[i]
    return diff === 0
  }

  async function verifyPortalToken(token: string) {
    const parts = String(token || '').split('.')
    if (parts.length !== 3) throw new Error('Invalid portal token')
    const payloadBytes = base64UrlDecode(parts[1])
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes))
    if (payload.exp && Number(payload.exp) < Math.floor(Date.now() / 1000)) {
      throw new Error('Portal token expired')
    }
    const expected = await signPortalToken(payload)
    if (!safeEqual(token, expected)) throw new Error('Invalid portal token signature')
    return payload
  }

  async function authenticate() {
    const token = req.headers.get('x-portal-token')
    if (!token) throw new Error('Missing portal token')
    const payload = await verifyPortalToken(token)
    const role = String(payload.role || '')
    if (!role) throw new Error('Invalid portal token role')
    return {
      role,
      userId: String(payload.user_id || payload.user || ''),
      studentId: String(payload.student_id || '')
    }
  }

  function canManage(auth: { role: string }) {
    return ADMIN_ROLES.has(auth.role)
  }

  function sanitize(value: unknown, maxLen = 1000): string {
    if (typeof value !== 'string') return ''
    return value.slice(0, maxLen).trim()
  }

  function sanitizeTitle(value: unknown): string {
    return sanitize(value, 200)
  }

  function sanitizeDescription(value: unknown): string {
    return sanitize(value, 5000)
  }

  function sanitizeId(value: unknown): string {
    return sanitize(value, 80)
  }

  function parseDate(value: unknown): string | null {
    const raw = sanitize(value, 20)
    if (!raw) return null
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
    const date = new Date(raw)
    if (Number.isNaN(date.getTime())) return null
    return date.toISOString().slice(0, 10)
  }

  function normalizeTargetType(value: unknown): string {
    const target = String(value || 'student').toLowerCase()
    return target === 'batch' ? 'batch' : 'student'
  }

  function normalizeStatus(value: unknown, allowed: string[], fallback: string): string {
    const status = String(value || '').toLowerCase()
    return allowed.includes(status) ? status : fallback
  }

  function parseNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null
    const number = Number(value)
    return Number.isFinite(number) ? number : null
  }

  function getStudentIds(batch: Record<string, unknown>): string[] {
    const ids = batch.student_ids
    if (Array.isArray(ids)) return ids.map(String)
    if (typeof ids === 'string') {
      try {
        const parsed = JSON.parse(ids)
        return Array.isArray(parsed) ? parsed.map(String) : []
      } catch (_e) {
        return []
      }
    }
    return []
  }

  function safeFileExtension(name: string) {
    const lower = name.toLowerCase()
    const dot = lower.lastIndexOf('.')
    return dot >= 0 ? lower.slice(dot) : ''
  }

  function safeFileName(name: string) {
    return String(name || 'homework-file')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120) || 'homework-file'
  }

  async function fetchAssignments(query: any) {
    const { data, error } = await query
    if (error) throw error
    return data || []
  }

  async function fetchStudent(studentId: string): Promise<Record<string, unknown> | null> {
    const { data, error } = await supabase
      .from('students')
      .select('id, name, batch_id')
      .eq('id', studentId)
      .single()
    if (error || !data) return null
    return data
  }

  async function fetchBatch(batchId: string): Promise<Record<string, unknown> | null> {
    const { data, error } = await supabase
      .from('batches')
      .select('id, name, student_ids')
      .eq('id', batchId)
      .single()
    if (error || !data) return null
    return data
  }

  async function fetchBatchesForStudent(studentId: string): Promise<Record<string, unknown>[]> {
    const student = await fetchStudent(studentId)
    const batchIds = new Set<string>()
    if (student?.batch_id) batchIds.add(String(student.batch_id))

    const { data, error } = await supabase
      .from('batches')
      .select('id, name, student_ids')
      .contains('student_ids', [studentId])

    if (!error && Array.isArray(data)) {
      data.forEach((batch) => batchIds.add(String(batch.id)))
    }

    if (batchIds.size === 0) return []

    const { data: batches, error: batchError } = await supabase
      .from('batches')
      .select('id, name, student_ids')
      .in('id', [...batchIds])

    if (batchError) return []
    return batches || []
  }

  async function fetchStudentsMap(assignments: Record<string, unknown>[]) {
    const ids = [...new Set(assignments.map((a) => a.student_id).filter(Boolean).map(String))]
    if (ids.length === 0) return new Map()
    const { data, error } = await supabase
      .from('students')
      .select('id, name')
      .in('id', ids)
    if (error) return new Map()
    return new Map((data || []).map((student: Record<string, unknown>) => [String(student.id), student]))
  }

  async function fetchBatchesMap(assignments: Record<string, unknown>[]) {
    const ids = [...new Set(assignments.map((a) => a.batch_id).filter(Boolean).map(String))]
    if (ids.length === 0) return new Map()
    const { data, error } = await supabase.from('batches').select('id, name, coach_id, days, time_slot')
      .in('id', ids)
    if (error) return new Map()
    return new Map((data || []).map((batch: Record<string, unknown>) => [String(batch.id), batch]))
  }

  async function fetchCompletions(assignments: Record<string, unknown>[], studentId?: string) {
    const ids = [...new Set(assignments.map((a) => a.id).filter(Boolean).map(String))]
    if (ids.length === 0) return []
    let query = supabase
      .from('homework_completion')
      .select('*')
      .in('assignment_id', ids)
      .order('updated_at', { ascending: false })
    if (studentId) query = query.eq('student_id', studentId)
    const { data, error } = await query
    if (error) return []
    return data || []
  }

  async function signFiles(files: Record<string, unknown>[]) {
    const signedFiles: Record<string, unknown>[] = []
    for (const file of files) {
      const path = String(file.file_path || '')
      if (!path) continue
      const { data, error } = await supabase.storage.from(HOMEWORK_BUCKET).createSignedUrl(path, 7 * 24 * 60 * 60)
      signedFiles.push({
        ...file,
        file_url: error ? '' : data?.signedUrl || ''
      })
    }
    return signedFiles
  }

  function transformCompletion(completion: Record<string, unknown>) {
    const files = Array.isArray(completion.submission_files) ? completion.submission_files as Record<string, unknown>[] : []
    return {
      id: completion.id,
      assignment_id: completion.assignment_id,
      student_id: completion.student_id,
      status: completion.status || 'pending',
      notes: completion.notes || '',
      submitted_at: completion.submitted_at,
      submission_notes: completion.submission_notes || '',
      submission_files: files,
      submission_status: completion.submission_status || (completion.submitted_at ? 'submitted' : 'missing'),
      revision_count: Number(completion.revision_count || 0),
      revision_notes: completion.revision_notes || '',
      next_action: completion.next_action || '',
      next_action_by: completion.next_action_by || '',
      notification_sent: completion.notification_sent || false,
      notification_group_id: completion.notification_group_id || null,
      notification_batch_id: completion.notification_batch_id || null,
      review_started_at: completion.review_started_at || null,
      review_closed_at: completion.review_closed_at || null,
      grade_status: completion.grade_status || 'ungraded',
      mark: completion.mark === null || completion.mark === undefined ? null : Number(completion.mark),
      graded_at: completion.graded_at,
      graded_by: completion.graded_by || '',
      coach_review: completion.coach_review || '',
      updated_at: completion.updated_at
    }
  }

  function transformAssignment(
    assignment: Record<string, unknown>,
    completions: Record<string, unknown>[],
    students: Map<string, Record<string, unknown>>,
    batches: Map<string, Record<string, unknown>>,
    viewerStudentId?: string
  ) {
    const assignmentId = String(assignment.id || '')
    const student = students.get(String(assignment.student_id || ''))
    const batch = batches.get(String(assignment.batch_id || ''))
    const assignmentCompletions = completions
      .filter((c) => String(c.assignment_id) === assignmentId)
      .map(transformCompletion)
    const studentCompletion = viewerStudentId
      ? assignmentCompletions.find((c) => String(c.student_id) === String(viewerStudentId)) || null
      : null
    const targetLabel = assignment.target_type === 'batch'
      ? String(batch?.name || assignment.batch_id || 'Batch')
      : String(student?.name || assignment.student_id || 'Student')
    const totalStudents = assignment.target_type === 'batch' ? Math.max(getStudentIds(batch || {}).length, assignmentCompletions.length) : assignmentCompletions.length || 1
    const doneCount = assignmentCompletions.filter((c) => c.status === 'done').length
    const submittedCount = assignmentCompletions.filter((c) => c.submitted_at).length
    const gradedCount = assignmentCompletions.filter((c) => c.grade_status === 'graded').length
    const activeCompletion = studentCompletion || assignmentCompletions[0] || null
    const maxMarks = Number(assignment.max_marks || 100)

return {
      id: assignment.id,
      target_type: assignment.target_type || 'student',
      student_id: assignment.student_id || null,
      batch_id: assignment.batch_id || null,
      coach_id: assignment.coach_id || batch?.coach_id || null,
      title: assignment.title || '',
      description: assignment.description || '',
      due_date: assignment.due_date ? String(assignment.due_date).slice(0, 10) : null,
      status: assignment.status || 'active',
      max_marks: maxMarks,
      created_by: assignment.created_by || '',
      created_at: assignment.created_at,
      updated_at: assignment.updated_at,
      student_name: student?.name || '',
      batch_name: batch?.name || '',
      target_label: targetLabel,
      completion_status: activeCompletion?.status || 'pending',
      completed_at: activeCompletion?.completed_at || activeCompletion?.parent_acknowledged_at || null,
      completion_notes: activeCompletion?.notes || '',
      grade_status: activeCompletion?.grade_status || 'ungraded',
      mark: activeCompletion?.mark,
      coach_review: activeCompletion?.coach_review || '',
      student_completion: studentCompletion,
      student_completions: assignmentCompletions,
      completion_summary: {
        total_students: totalStudents,
        done_count: doneCount,
        submitted_count: submittedCount,
        pending_count: Math.max(totalStudents - submittedCount, 0),
        graded_count: gradedCount,
        average_mark: gradedCount > 0
          ? Number((assignmentCompletions.reduce((sum, c) => sum + (Number(c.mark) || 0), 0) / gradedCount).toFixed(2))
          : null
      }
    }
  }

  async function enrichAssignments(
    assignments: Record<string, unknown>[],
    auth: { role: string; studentId: string },
    options: { completions?: Record<string, unknown>[], students?: Map<string, Record<string, unknown>>, batches?: Map<string, Record<string, unknown>> } = {}
  ) {
    const completions = options.completions ?? await fetchCompletions(assignments, auth.role === 'parent' ? auth.studentId : undefined)
    const students = options.students ?? await fetchStudentsMap(assignments)
    const batches = options.batches ?? await fetchBatchesMap(assignments)
    const enriched = assignments
      .filter((a) => (a.status || 'active') !== 'archived')
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
      .map((assignment) => transformAssignment(assignment, completions, students, batches, auth.role === 'parent' ? auth.studentId : undefined))

    for (const item of enriched) {
      const completionsWithFiles = [...(item.student_completions || []), item.student_completion].filter(Boolean)
      for (const completion of completionsWithFiles) {
        completion.submission_files = await signFiles(Array.isArray(completion.submission_files) ? completion.submission_files : [])
      }
    }
    return enriched
  }

  async function studentCanSeeAssignment(assignment: Record<string, unknown>, studentId: string) {
    if (String(assignment.student_id || '') === studentId) return true
    if (!assignment.batch_id) return false
    const batch = await fetchBatch(String(assignment.batch_id))
    if (!batch) return false
    if (getStudentIds(batch).includes(studentId)) return true
    const student = await fetchStudent(studentId)
    return String(student?.batch_id || '') === String(assignment.batch_id)
  }

  async function studentCanCompleteAssignment(assignment: Record<string, unknown>, studentId: string) {
    const canSee = await studentCanSeeAssignment(assignment, studentId)
    if (!canSee) throw new Error('Student is not part of this homework assignment')
  }

  async function upsertCompletion(completionData: Record<string, unknown>, preserveReview = false) {
    const { data: existing, error: existingError } = await supabase
      .from('homework_completion')
      .select('id, completed_at, parent_acknowledged_at, grade_status, mark, coach_review, submission_files, review_closed_at')
      .eq('assignment_id', String(completionData.assignment_id))
      .eq('student_id', String(completionData.student_id))
      .maybeSingle()

    if (existingError) throw existingError
    if (existing && !completionData.id) {
      completionData.id = existing.id
      if (preserveReview) {
        completionData.grade_status = existing.grade_status || completionData.grade_status || 'ungraded'
        completionData.mark = existing.mark ?? completionData.mark
        completionData.coach_review = existing.coach_review || completionData.coach_review || ''
        completionData.review_closed_at = existing.review_closed_at || completionData.review_closed_at || null
        completionData.review_started_at = existing.review_closed_at
          ? existing.review_started_at
          : completionData.review_started_at || null
      }
      if (completionData.status !== 'done') {
        completionData.completed_at = existing.completed_at || null
        completionData.parent_acknowledged_at = existing.parent_acknowledged_at || null
        if (!preserveReview) completionData.grade_status = 'ungraded'
        if (!preserveReview) completionData.mark = null
      }
    }

    const { data: completion, error: completionError } = await supabase
      .from('homework_completion')
      .upsert(completionData, { onConflict: 'assignment_id,student_id' })
      .select()
      .single()

    if (completionError) throw completionError
    return completion
  }

  async function uploadFiles(files: File[], studentId: string, assignmentId: string) {
    const uploaded: Record<string, unknown>[] = []
    for (const file of files) {
      const extension = safeFileExtension(file.name)
      if (!ALLOWED_EXTENSIONS.has(extension)) {
        throw new Error(`Unsupported file type: ${file.name}`)
      }
      if (!ALLOWED_MIME_TYPES.has(file.type) && !file.type.startsWith('image/')) {
        throw new Error(`Unsupported file type: ${file.name}`)
      }
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File too large: ${file.name}`)
      }
      const path = `homework/${studentId}/${assignmentId}/${crypto.randomUUID()}-${safeFileName(file.name)}`
      const { data, error } = await supabase.storage
        .from(HOMEWORK_BUCKET)
        .upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false })
      if (error) throw error
      uploaded.push({
        file_name: file.name,
        file_path: path,
        mime_type: file.type || 'application/octet-stream',
        file_size: file.size
      })
    }
    return uploaded
  }

  async function getAssignmentsForViewer(auth: { role: string; studentId: string }, url: URL) {
    const id = sanitizeId(url.searchParams.get('id'))
    const studentId = sanitizeId(url.searchParams.get('student_id'))
    const batchId = sanitizeId(url.searchParams.get('batch_id'))
    const statusFilter = url.searchParams.get('status')

    if (id) {
      const assignments = await fetchAssignments(
        supabase
          .from('homework_assignments')
          .select('*')
          .eq('id', id)
          .limit(1)
      )
      if (auth.role === 'parent' && studentId && assignments.length > 0) {
        await studentCanSeeAssignment(assignments[0], studentId)
      }
      return assignments
    }

    if (auth.role === 'parent') {
      const viewerStudentId = studentId || auth.studentId
      if (!viewerStudentId) throw new Error('Parent student context is required')
      const studentAssignments = await fetchAssignments(
        supabase
          .from('homework_assignments')
          .select('*')
          .eq('student_id', viewerStudentId)
          .order('created_at', { ascending: false })
          .limit(200)
      )
      const batchIds = (await fetchBatchesForStudent(viewerStudentId)).map((b) => String(b.id))
      const batchAssignments = batchIds.length > 0
        ? await fetchAssignments(
          supabase
            .from('homework_assignments')
            .select('*')
            .in('batch_id', batchIds)
            .order('created_at', { ascending: false })
            .limit(200)
        )
        : []
      const combined = [...studentAssignments, ...batchAssignments]
      const seen = new Set<string>()
      return combined.filter((assignment) => {
        const key = String(assignment.id)
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
    }

    let query = supabase
      .from('homework_assignments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    if (studentId) query = query.eq('student_id', studentId)
    if (batchId) query = query.eq('batch_id', batchId)
    if (statusFilter) query = query.eq('status', statusFilter)
    return fetchAssignments(query)
  }

  try {
    const url = new URL(req.url)
    const method = req.method
    const id = url.searchParams.get('id')
    const auth = await authenticate()

    if (method === 'GET') {
      const assignments = await getAssignmentsForViewer(auth, url)
      const reviewQueue = String(url.searchParams.get('queue') || '') === '1' && canManage(auth)
      if (auth.role === 'parent') {
        for (const assignment of assignments) await studentCanSeeAssignment(assignment, auth.studentId)
      }
      let completions = await fetchCompletions(assignments, auth.role === 'parent' ? auth.studentId : undefined)
      const students = await fetchStudentsMap(assignments)
      const batches = await fetchBatchesMap(assignments)

      if (reviewQueue) {
        const nowIso = new Date().toISOString()
        completions = completions.filter((c) => {
          const status = String(c.status || '')
          const grade = String(c.grade_status || 'ungraded')
          const next = String(c.next_action || '')
          return status === 'done' && (grade === 'ungraded' || next === 'revise' || !c.review_closed_at)
        })
      }

      return json({
        data: await enrichAssignments(assignments, auth, { completions, students, batches })
      })
    }

    if (method === 'POST') {
      const contentType = req.headers.get('content-type') || ''
      let formBody: FormData | null = null
      const body: Record<string, unknown> = contentType.includes('multipart/form-data')
        ? await (async () => {
          formBody = await req.formData()
          return Object.fromEntries(formBody.entries())
        })()
        : await req.json().catch(() => ({}))

      if (body.completion) {
        const completionBody = body.completion as Record<string, unknown>
        const assignmentId = sanitizeId(completionBody.assignment_id)
        const studentId = sanitizeId(completionBody.student_id)
        const status = normalizeStatus(completionBody.status, ['pending', 'done'], 'pending')

        if (!assignmentId || !studentId) return json({ error: 'assignment_id and student_id are required' }, 400)
        if (auth.role === 'parent' && String(studentId) !== auth.studentId) return json({ error: 'You can only update your own child' }, 403)
        if (!canManage(auth) && auth.role !== 'parent') return json({ error: 'Forbidden' }, 403)

        const { data: assignment, error: assignmentError } = await supabase
          .from('homework_assignments')
          .select('*')
          .eq('id', assignmentId)
          .single()
        if (assignmentError || !assignment) return json({ error: 'Homework assignment not found' }, 404)

        await studentCanCompleteAssignment(assignment, studentId)
        const now = new Date().toISOString()
        const completion = await upsertCompletion({
          id: sanitizeId(completionBody.id) || crypto.randomUUID(),
          assignment_id: assignmentId,
          student_id: studentId,
          status,
          notes: sanitizeDescription(completionBody.notes),
          completed_at: status === 'done' ? now : null,
          parent_acknowledged_at: status === 'done' ? now : null,
          updated_at: now
        })

        const updatedAssignment = await supabase
          .from('homework_assignments')
          .select('*')
          .eq('id', assignmentId)
          .single()
          .then((res: any) => res.data)

        return json({ success: true, data: await enrichAssignments([updatedAssignment], auth) })
      }

      if (String(body.action) === 'submit') {
        if (auth.role !== 'parent') return json({ error: 'Only parents can submit homework files' }, 403)
        const assignmentId = sanitizeId(body.assignment_id)
        const studentId = sanitizeId(body.student_id)
        const notes = sanitizeDescription(body.notes)
        if (!assignmentId || !studentId) return json({ error: 'assignment_id and student_id are required' }, 400)
        if (String(studentId) !== auth.studentId) return json({ error: 'You can only submit for your own child' }, 403)

        const { data: assignment, error: assignmentError } = await supabase
          .from('homework_assignments')
          .select('*')
          .eq('id', assignmentId)
          .single()
        if (assignmentError || !assignment) return json({ error: 'Homework assignment not found' }, 404)
        await studentCanCompleteAssignment(assignment, studentId)

        const formData = formBody || (await req.formData())
        const files = Array.from(formData.getAll('files')).filter((item): item is File => item instanceof File)
        const uploadedFiles = await uploadFiles(files, studentId, assignmentId)
        const { data: existingCompletion } = await supabase
          .from('homework_completion')
          .select('submission_files, submission_status, revision_count, submitted_at')
          .eq('assignment_id', assignmentId)
          .eq('student_id', studentId)
          .maybeSingle()
        const existingFiles = Array.isArray(existingCompletion?.submission_files) ? existingCompletion.submission_files as Record<string, unknown>[] : []
        const now = new Date().toISOString()
        const due = assignment.due_date ? new Date(`${assignment.due_date}T23:59:59`) : null
        const isLate = due ? now > due.toISOString() : false
        const wasSubmitted = Boolean(existingCompletion?.submitted_at)
        const submissionStatus = isLate ? 'late' : wasSubmitted ? 'resubmitted' : 'submitted'
        const revisionCount = Number(existingCompletion?.revision_count || (wasSubmitted ? 1 : 0))
        if (isLate) {
          await supabase.from('homework_notification_groups').insert({
            homework_id: assignmentId,
            student_id,
            scope: 'student',
            payload: { reason: 'late_submission', assignment_id: assignmentId },
            status: 'sent',
            sent_at: now
          })
        }
        const completion = await upsertCompletion({
          id: crypto.randomUUID(),
          assignment_id: assignmentId,
          student_id: studentId,
          status: 'done',
          notes,
          submission_notes: notes,
          submitted_at: now,
          completed_at: now,
          parent_acknowledged_at: now,
          submission_status,
          revision_count: revisionCount,
          submission_files: uploadedFiles.length > 0 ? uploadedFiles : existingFiles,
          grade_status: existingCompletion?.grade_status || 'ungraded',
          mark: existingCompletion?.mark ?? null,
          coach_review: existingCompletion?.coach_review || '',
          updated_at: now
        }, true)

        const updatedAssignment = await supabase
          .from('homework_assignments')
          .select('*')
          .eq('id', assignmentId)
          .single()
          .then((res: any) => res.data)

        return json({ success: true, data: await enrichAssignments([updatedAssignment], auth), submission_status })
      }

      if (body.grade) {
        if (!canManage(auth)) return json({ error: 'Forbidden' }, 403)
        const gradeBody = body.grade as Record<string, unknown>
        const assignmentId = sanitizeId(gradeBody.assignment_id)
        const studentId = sanitizeId(gradeBody.student_id)
        const mark = parseNumber(gradeBody.mark)
        const coachReview = sanitizeDescription(gradeBody.coach_review)
        if (!assignmentId || !studentId) return json({ error: 'assignment_id and student_id are required' }, 400)

        const { data: assignment, error: assignmentError } = await supabase
          .from('homework_assignments')
          .select('*')
          .eq('id', assignmentId)
          .single()
        if (assignmentError || !assignment) return json({ error: 'Homework assignment not found' }, 404)
        await studentCanCompleteAssignment(assignment, studentId)

        const maxMarks = Number(assignment.max_marks || 100)
        if (mark !== null && (mark < 0 || mark > maxMarks)) return json({ error: `Mark must be between 0 and ${maxMarks}` }, 400)

        const now = new Date().toISOString()
        const { data: existingReview } = await supabase
          .from('homework_completion')
          .select('coach_review, next_action, review_closed_at, review_started_at, grade_status, mark')
          .eq('assignment_id', assignmentId)
          .eq('student_id', studentId)
          .maybeSingle()
        const completion = await upsertCompletion({
          id: crypto.randomUUID(),
          assignment_id: assignmentId,
          student_id: studentId,
          status: 'done',
          notes: '',
          mark,
          submission_status: 'reviewed',
          grade_status: mark === null ? 'ungraded' : 'graded',
          graded_at: mark === null ? null : now,
          graded_by: auth.userId,
          coach_review: coachReview,
          next_action: coachReview ? 'revise' : String(existingReview?.next_action || ''),
          next_action_by: studentId,
          review_started_at: now,
          updated_at: now
        }, true)

        const updatedAssignment = await supabase
          .from('homework_assignments')
          .select('*')
          .eq('id', assignmentId)
          .single()
          .then((res: any) => res.data)

        return json({ success: true, data: await enrichAssignments([updatedAssignment], auth) })
      }

      if (!canManage(auth)) return json({ error: 'Forbidden' }, 403)
      const action = sanitize(String(body.action || ''), 20)

      if (action === 'send_reminders') {
        const scope = normalizeTargetType(body.scope ?? body.target_type ?? 'student')
        const batchId = sanitizeId(body.batch_id)
        const studentId = sanitizeId(body.student_id)
        const withinDays = Number(body.within_days || 1)
        const nowIso = new Date().toISOString()
        const windowEnd = new Date()
        windowEnd.setDate(windowEnd.getDate() + withinDays)
        const windowEndDate = windowEnd.toISOString().slice(0, 10)

        let targetQuery = supabase
          .from('homework_assignments')
          .select('id, title, due_date, batch_id, student_id, reminder_sent_at, reminder_sent_at_date')
          .eq('status', 'active')
          .lte('due_date', windowEndDate)
          .or(`reminder_sent_at.is.null,reminder_sent_at_date.lt.${windowEndDate}`)

        if (scope === 'batch' && batchId) targetQuery = targetQuery.eq('batch_id', batchId)
        if (scope === 'student' && studentId) targetQuery = targetQuery.eq('student_id', studentId)

        const { data: targets, error: targetError } = await targetQuery
        if (targetError) throw targetError
        const assignments = targets || []
        const ids = assignments.map((a) => String(a.id)).filter(Boolean)

        let completionsQuery = supabase
          .from('homework_completion')
          .select('assignment_id, student_id, submitted_at, notification_sent, notification_group_id')
          .in('assignment_id', ids.length ? ids : [new Date().toISOString()])

        const { data: completions } = await completionsQuery
        const completionMap = new Map((completions || []).map((c) => [`${c.assignment_id}::${c.student_id}`, c]))

        const groups: Record<string, { ids: string[]; assignmentIds: Set<string> }> = {}
        for (const assignment of assignments) {
          const aId = String(assignment.id)
          const { data: batchData } = await supabase.from('batches').select('student_ids').eq('id', assignment.batch_id).maybeSingle()
          const studentIds = (batchData?.student_ids || []).map(String).filter(Boolean)
          for (const sid of studentIds) {
            const key = `${aId}::${sid}`
            const completion = completionMap.get(key)
            if (completion?.submitted_at || completion?.notification_sent) continue
            const groupKey = `batch::${assignment.batch_id}`
            if (!groups[groupKey]) groups[groupKey] = { ids: [], assignmentIds: new Set() }
            groups[groupKey].ids.push(key)
            groups[groupKey].assignmentIds.add(aId)
          }
        }

        const notificationInserts: Record<string, unknown>[] = []
        const assignmentUpdates: string[][] = []
        for (const [groupKey, group] of Object.entries(groups)) {
          const groupId = crypto.randomUUID()
          const [, refId] = groupKey.split('::')
          notificationInserts.push({
            id: groupId,
            homework_id: group.assignmentIds.size === 1 ? [...group.assignmentIds][0] : null,
            batch_id: refId || null,
            scope: 'batch',
            status: 'pending',
            payload: { reason: 'due_reminder', assignment_ids: [...group.assignmentIds], student_ids: group.ids },
            created_at: nowIso,
            updated_at: nowIso
          })
          assignmentUpdates.push([...group.assignmentIds])
        }

        if (notificationInserts.length) {
          const { error: insertError } = await supabase.from('homework_notification_groups').insert(notificationInserts)
          if (insertError) throw insertError
        }

        for (const aIds of assignmentUpdates) {
          for (const aId of aIds) {
            await supabase.from('homework_assignments').update({ reminder_sent_at: nowIso, reminder_sent_at_date: windowEndDate, updated_at: nowIso }).eq('id', aId)
          }
        }

        const whatsappApiUrl = Deno.env.get('WHATSAPP_API_URL')
        const whatsappToken = Deno.env.get('WHATSAPP_API_TOKEN')
        if (whatsappApiUrl && whatsappToken) {
          for (const assignment of assignments) {
            const { data: batchStudents } = await supabase.from('batches').select('student_ids').eq('id', assignment.batch_id).maybeSingle()
            const studentIds = (batchStudents?.student_ids || []).map(String).filter(Boolean)
            for (const sid of studentIds) {
              const key = `${assignment.id}::${sid}`
              const completion = completionMap.get(key)
              if (completion?.submitted_at || completion?.notification_sent) continue
              const { data: student } = await supabase.from('students').select('parent_phone').eq('id', sid).maybeSingle()
              const phone = student?.parent_phone ? String(student.parent_phone).replace(/\D/g, '') : ''
              if (phone && phone.length >= 8) {
                const msg = `🔔 *Homework Reminder*\n\n${assignment.title} is due on ${assignment.due_date}. Please check the parent portal for details.`
                try {
                  await fetch(`${whatsappApiUrl}/api/send`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${whatsappToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone, message: msg })
                  })
                  await supabase.from('homework_completion').update({ notification_sent: true, updated_at: nowIso }).eq('assignment_id', assignment.id).eq('student_id', sid)
                } catch (e) {
                  console.warn('WhatsApp send failed for student', sid, e.message)
                }
              }
            }
          }
        }

        return json({ success: true, reminders: notificationInserts.length, assignments: assignments.length })
      }

      if (action === 'review_close') {
        const target = (body.target as Record<string, unknown>) || {}
        const assignmentId = sanitizeId(target.assignment_id)
        const studentIds = sanitizeId(target.student_ids || target.student_id || '').split(',').map((s) => s.trim()).filter(Boolean)
        if (!assignmentId) return json({ error: 'assignment_id is required' }, 400)
        if (!studentIds.length) return json({ error: 'student_ids is required' }, 400)

        const { data: existing } = await supabase.from('homework_completion').select('id, student_id, review_closed_at').eq('assignment_id', assignmentId).in('student_id', studentIds)
        const unclosed = (existing || []).filter((row) => !String(row.review_closed_at || ''))
        if (!unclosed.length) return json({ error: 'No open reviews to close' }, 409)

        const now = new Date().toISOString()
        const { error: closeError } = await supabase.from('homework_completion').update({ review_closed_at: now, updated_at: now }).eq('assignment_id', assignmentId).in('student_id', unclosed.map((row) => row.student_id))
        if (closeError) throw closeError

        return json({ success: true, closed: unclosed.length })
      }

      if (action === 'reopen_review') {
        const target = (body.target as Record<string, unknown>) || {}
        const assignmentId = sanitizeId(target.assignment_id)
        const studentId = sanitizeId(target.student_id)
        if (!assignmentId || !studentId) return json({ error: 'assignment_id and student_id are required' }, 400)

        const now = new Date().toISOString()
        const { error: updateError } = await supabase
          .from('homework_completion')
          .update({ review_closed_at: null, updated_at: now })
          .eq('assignment_id', assignmentId)
          .eq('student_id', studentId)

        if (updateError) throw updateError
        return json({ success: true })
      }

const targetType = normalizeTargetType(body.target_type ?? body.targetType)
      const studentId = sanitizeId(body.student_id)
      const batchId = sanitizeId(body.batch_id)
      const coachId = sanitizeId(body.coach_id)
      const title = sanitizeTitle(body.title)
      const description = sanitizeDescription(body.description ?? body.instructions)
      const dueDate = parseDate(body.due_date)
      const maxMarks = Math.max(1, Math.min(100, parseNumber(body.max_marks) || 100))

      if (!title) return json({ error: 'Homework title is required' }, 400)
      if (targetType === 'student' && !studentId) return json({ error: 'student_id is required for student homework' }, 400)
      if (targetType === 'batch' && !batchId) return json({ error: 'batch_id is required for batch homework' }, 400)
      if (targetType === 'student' && !(await fetchStudent(studentId))) return json({ error: 'Student not found' }, 404)
      if (targetType === 'batch' && !(await fetchBatch(batchId))) return json({ error: 'Batch not found' }, 404)

      let resolvedCoachId = coachId;
      if (targetType === 'batch' && !resolvedCoachId && batchId) {
        const { data: batchData } = await supabase.from('batches').select('coach_id').eq('id', batchId).maybeSingle();
        resolvedCoachId = batchData?.coach_id ? String(batchData.coach_id) : null;
      }

      const now = new Date().toISOString()
      const newAssignment: Record<string, unknown> = {
        id: crypto.randomUUID(),
        target_type: targetType,
        student_id: targetType === 'student' ? studentId : null,
        batch_id: targetType === 'batch' ? batchId : null,
        coach_id: resolvedCoachId ? resolvedCoachId : null,
        title,
        description,
        due_date: dueDate,
        max_marks: maxMarks,
        status: 'active',
        created_by: auth.userId,
        created_at: now,
        updated_at: now
      }

      const { data, error } = await supabase
        .from('homework_assignments')
        .insert(newAssignment)
        .select()
        .single()

      if (error) throw error

      return json({ success: true, data: await enrichAssignments([data], auth) }, 201)
    }

    if (method === 'PUT') {
      if (!canManage(auth)) return json({ error: 'Forbidden' }, 403)
      if (!id) return json({ error: 'Homework assignment id is required' }, 400)

      const body: Record<string, unknown> = await req.json().catch(() => ({}))
      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }

      if (body.title !== undefined) updateData.title = sanitizeTitle(body.title)
      if (body.description !== undefined || body.instructions !== undefined) {
        updateData.description = sanitizeDescription(body.description ?? body.instructions)
      }
      if (body.due_date !== undefined) updateData.due_date = parseDate(body.due_date)
      if (body.max_marks !== undefined) {
        const maxMarks = Math.max(1, Math.min(100, parseNumber(body.max_marks) || 100))
        updateData.max_marks = maxMarks
      }
      if (body.status !== undefined) {
        updateData.status = normalizeStatus(body.status, ['active', 'completed', 'archived'], 'active')
      }
if (body.target_type !== undefined || body.targetType !== undefined) {
        const targetType = normalizeTargetType(body.target_type ?? body.targetType)
        const studentId = sanitizeId(body.student_id)
        const batchId = sanitizeId(body.batch_id)
        const coachId = sanitizeId(body.coach_id)
        if (targetType === 'student' && !studentId) return json({ error: 'student_id is required for student homework' }, 400)
        if (targetType === 'batch' && !batchId) return json({ error: 'batch_id is required for batch homework' }, 400)
        if (targetType === 'student' && !(await fetchStudent(studentId))) return json({ error: 'Student not found' }, 404)
        if (targetType === 'batch' && !(await fetchBatch(batchId))) return json({ error: 'Batch not found' }, 404)
        updateData.target_type = targetType
        updateData.student_id = targetType === 'student' ? studentId : null
        updateData.batch_id = targetType === 'batch' ? batchId : null
        let resolvedCoachId = coachId;
        if (targetType === 'batch' && !resolvedCoachId && batchId) {
          const { data: batchData } = await supabase.from('batches').select('coach_id').eq('id', batchId).maybeSingle();
          resolvedCoachId = batchData?.coach_id ? String(batchData.coach_id) : null;
        }
        updateData.coach_id = resolvedCoachId ? resolvedCoachId : null
      }

      const { data: assignment, error: updateError } = await supabase
        .from('homework_assignments')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError

      return json({ success: true, data: await enrichAssignments([assignment], auth) })
    }

    if (method === 'DELETE') {
      if (!canManage(auth)) return json({ error: 'Forbidden' }, 403)
      if (!id) return json({ error: 'Homework assignment id is required' }, 400)

      const { error } = await supabase
        .from('homework_assignments')
        .update({ status: 'archived', updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error

      return json({ success: true, id })
    }

    return json({ error: 'Method not allowed' }, 405)
  } catch (error: any) {
    return json({ error: error.message || 'Server error' }, 500)
  }
})


