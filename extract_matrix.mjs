import fs from 'fs';
import readline from 'readline';
import * as cheerio from 'cheerio'; // Make sure we install cheerio or just use regex

const logPath = 'C:\\Users\\Asus\\.gemini\\antigravity-ide\\brain\\6ff60ab2-4071-4808-a7b6-735c673d92eb\\.system_generated\\logs\\transcript.jsonl';

async function processLineByLine() {
  const fileStream = fs.createReadStream(logPath);

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (line.includes('Chess Academy - Master Schedule Matrix')) {
      try {
        const obj = JSON.parse(line);
        if (obj.content && obj.content.includes('Master Schedule Matrix')) {
          let html = obj.content.substring(obj.content.indexOf('<!DOCTYPE html>'));
          // remove ending quotes or strings if needed
          if (html.includes('</html')) {
            html = html.substring(0, html.indexOf('</html>') + 7);
          }
          fs.writeFileSync('scratch/matrix.html', html, 'utf8');
          console.log('Successfully wrote matrix.html');
          return;
        }
      } catch (e) {
        console.error('Error parsing line:', e.message);
      }
    }
  }
}

processLineByLine();
