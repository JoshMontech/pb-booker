import { chromium, Browser, Page, ElementHandle } from 'playwright';
import dotenv from 'dotenv';

// whatever your path is for the .env file
dotenv.config({ path: '/home/ec2-user/pb-booker/.env' });
enum DayEnum {
    SUNDAY = 'Sun',
    MONDAY = 'Mon',
    TUESDAY = 'Tue',
    WEDNESDAY = 'Wed',
    THURSDAY = 'Thu',
    FRIDAY = 'Fri',
    SATURDAY = 'Sat'
}
const WEEKLY_DATES_TO_BOOK = [DayEnum.TUESDAY, DayEnum.WEDNESDAY, DayEnum.THURSDAY, DayEnum.FRIDAY];

const isBookingDate = (date: string): boolean => {
    return WEEKLY_DATES_TO_BOOK.some(dayStr => date.includes(dayStr));
}

async function login(page: Page) {
    try {
    console.log('Navigating to login page...');
    await page.goto('https://austinpickleranch.podplay.app/login?redirect=%2Faccount&loginMode=password', { waitUntil: 'networkidle' });
  
    console.log('Entering credentials...');
    await page.fill('#loginEmail', process.env.USERNAME || '');
    await page.fill('#loginPassword', process.env.PASSWORD || '');
  
    console.log('Submitting login form...');
    await Promise.all([
        page.click('.Button_Button__button__kJZba.Button_Button__button--dark__aKceN'),
      page.waitForURL('https://austinpickleranch.podplay.app/account', { waitUntil: 'networkidle' }),
    ]);
        console.log('Login successful.');
    } catch (error) {
        console.error('Error logging in:', error);
        throw error;
    }
}

async function navigateToGeneralBookingPage(page: Page) {
    try {
    console.log('Navigating to general booking page...');
    await page.goto('https://austinpickleranch.podplay.app/community/events?level=Intermediate&type=Open+Play', { waitUntil: 'networkidle' });
    } catch (error) {
        console.error('Error navigating to general booking page:', error);
        throw error;
    }
}

async function checkForMostRecentBookingDate(page: Page): Promise<ElementHandle<Element> | null> {
    try {
        console.log('Searching for the most recent booking date...');
        const eventsContainer = await page.$('#eventsContainer');
        if (!eventsContainer) {
            throw new Error('Events container not found');
        }

        let lastDayCount = 0;
        let currentDayCount = 0;
        let lastValidDayContainer: ElementHandle<Element> | null = null;

        do {
            // Scroll to the bottom of the events container
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

            // Wait for potential new elements to load
            await page.waitForTimeout(5000);

            // Get all day containers
            const dayContainers = await page.$$('.EventsList_EventsList__day__6azGV');
            lastDayCount = currentDayCount;
            currentDayCount = dayContainers.length;

            // Check the last day container
            const lastDayContainer = dayContainers[dayContainers.length - 1];
            const dayTitle = await lastDayContainer.$('.EventsList_EventsList__day-title__YXTPc');
            if (dayTitle) {
                const dayText = await dayTitle.textContent();
                if (dayText && isBookingDate(dayText)) {
                    lastValidDayContainer = lastDayContainer;
                }
            }

        } while (currentDayCount > lastDayCount);

        return lastValidDayContainer;
    } catch (error) {
        console.error('Error finding valid booking date:', error);
        throw error;
    }
}

async function findAndClickAvailableTimeSlot(page: Page, dayContainer: ElementHandle<Element>) {
    try {
        console.log('Searching for 6pm-8pm slot...');
        const timeSlot = await dayContainer.$('a:has-text("6:00pm CDT"):has-text("8:00pm CDT")');
        if (timeSlot) {
            console.log('Found 6pm-8pm slot. Clicking...');
            await timeSlot.click();
            return true;
        } else {
            console.log('6pm-8pm slot not found.');
            return false;
        }
    } catch (error) {
        console.error('Error finding available time slot:', error);
        throw error;
    }
}

async function clickSignUpButton(page: Page) {
    try {
        console.log('Waiting for Sign up button to appear...');
        await page.waitForSelector('button:has-text("Sign up")', { timeout: 10000 });
        
        console.log('Clicking Sign up button...');
        await page.click('button:has-text("Sign up")');
        
        console.log('Successfully clicked Sign up button.');
        
        // Optional: Wait for any confirmation or next page to load
        await page.waitForLoadState('networkidle');
    } catch (error) {
        console.error('Error clicking Sign up button:', error);
        throw error;
    }
}

async function clickSubmitPaymentButton(page: Page) {
    try {
        console.log('Waiting for Submit Payment button to appear...');
        await page.waitForSelector('button:has-text("Submit payment")', { timeout: 10000 });
        
        console.log('Clicking Submit payment button...');
        await page.click('button:has-text("Submit payment")');
        
        console.log('Successfully clicked Submit payment button.');
    } catch (error) {
        console.error('Error clicking Submit payment button:', error);
        throw error;
    }
}

async function confirmDone(page: Page) {
    try {
        console.log('Waiting for Done button to appear...');
        await page.waitForSelector('button:has-text("Done")', { timeout: 10000 });
        
        console.log('Clicking Done button...');
        await page.click('button:has-text("Done")');
    } catch (error) {
        console.error('Error clicking Done button:', error);
        throw error;
    }
}

async function bookAppointment() {
    const browser: Browser = await chromium.launch({
        headless: true,
    });

    const page: Page = await browser.newPage();
  
    try {
        await login(page);
        await navigateToGeneralBookingPage(page);
        const mostRecentBookingDateContainer = await checkForMostRecentBookingDate(page);
        
        if (mostRecentBookingDateContainer) {
            const slotFound = await findAndClickAvailableTimeSlot(page, mostRecentBookingDateContainer);
            if (slotFound) {
                console.log('Successfully found and clicked the time slot.');
                // Add any additional steps needed after clicking the time slot
                await clickSignUpButton(page);
                await clickSubmitPaymentButton(page);
                await confirmDone(page)
            } else {
                console.log('No suitable time slot found.');
            }
        } else {
            console.log('No valid booking date found.');
        }
    } catch (error) {
        console.error('Error booking appointment:', error);
    } finally {
        await browser.close();
    }
}
console.log('Task started at', new Date().toISOString());
bookAppointment().then(() => console.log('Task ended at', new Date().toISOString()));
