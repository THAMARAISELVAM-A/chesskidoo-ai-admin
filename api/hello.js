 let allStudents = [];
let allCoaches = [];
let achievementsData = [];
let eventsData = [];

// Fetch all data on page load
async function loadData() {
  try {
    const [studentsRes, coachesRes, achievementsRes, eventsRes] = await Promise.all([
      fetch('https://project-yj5uk.vercel.app/api/students'),
      fetch('https://project-yj5uk.vercel.app/api/coaches'),
      fetch('https://project-yj5uk.vercel.app/api/achievements'),
      fetch('https://project-yj5uk.vercel.app/api/events')
    ]);

    allStudents = await studentsRes.json();
    allCoaches = await coachesRes.json();
    achievementsData = await achievementsRes.json();
    eventsData = await eventsRes.json();

    // Now, render the UI with fetched data
    renderStudents();
    renderCoaches();
    renderDash();
    renderAwards();
    renderEvents();
    console.log('✅ Data loaded from API');
  } catch (error) {
    console.error('❌ Error loading data:', error);
  }
}
window.addEventListener('load', loadData);
