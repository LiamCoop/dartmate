const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navigate to the app
    await page.goto('http://localhost:3001');
    await page.waitForSelector('body');
    
    // Wait for the page to load
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Click Create Room button
    await page.click('button::-p-text(Create Room)');
    
    // Wait for the room form to appear
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Fill in the name field and join the room
    await page.type('input[placeholder="Enter Your Name"]', 'TestPlayer');
    await page.click('button::-p-text(Join Room)');
    
    // Wait for the room screen to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Take a screenshot of the full page to see the radio buttons
    await page.screenshot({ 
      path: 'waiting-room-radio-buttons.png',
      fullPage: true 
    });
    
    console.log('Screenshot saved as waiting-room-radio-buttons.png');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();