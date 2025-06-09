import { config } from 'dotenv';
import { Builder, By, until, WebDriver } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';
import { EmailUser } from './types/email-user';
import { MailcowUser } from './types/mailcow-user';
import * as fs from 'fs';

const emails = JSON.parse(fs.readFileSync('./users.json', 'utf8'));

function removeVietnameseTones(name: string): string {
    const toneMap: { [key: string]: string } = {
        'à': 'a', 'á': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
        'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
        // Add more mappings as needed
    };

    return name.split('').map(char => toneMap[char] || char).join('');
}

// Configure environment variables
config();

// Constants
const MAILCOW_URL = process.env.MAILCOW_URL as string;
const ADMIN_USER = process.env.MAILCOW_ADMIN as string;
const ADMIN_PASS = process.env.MAILCOW_PASSWORD as string;
const DEFAULT_PASSWORD = process.env.MAILCOW_DEFAULT_PASSWORD as string;

// Map email data to user objects
const users: MailcowUser[] = emails.map(({ email, name, }: EmailUser) => {
    const [local_part, domain] = email.toLowerCase().split('@', 2);
    return {
        local_part,
        domain,
        name: removeVietnameseTones(name),
        password: DEFAULT_PASSWORD,
    };
});

console.log(users);

/**
 * Delay execution for specified milliseconds
 * @param ms - Time to sleep in milliseconds
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Log in to Mailcow admin panel
 * @param driver - Selenium WebDriver instance
 */
async function login(driver: WebDriver): Promise<void> {
    await driver.get(`${MAILCOW_URL}`);
    await sleep(1000);
    await driver.findElement(By.id('login_user')).sendKeys(ADMIN_USER);
    await driver.findElement(By.id('pass_user')).sendKeys(ADMIN_PASS);
    await driver.findElement(By.css('button[type="submit"]')).click();
    await driver.wait(until.urlContains('/debug'), 2000);
    console.log('✅ Logged in');
}

/**
 * Extract CSRF token from page source
 * @param driver - Selenium WebDriver instance
 * @returns CSRF token string
 */
async function extractCSRFToken(driver: WebDriver): Promise<{
    html: string;
    token: string;
}> {
    await driver.get(`${MAILCOW_URL}/mailbox`);

    const pageSource = await driver.getPageSource();
    const match = pageSource.match(/var\s+csrf_token\s*=\s*['"]([A-Za-z0-9]+)['"]/m);

    if (!match) throw new Error('CSRF token not found');

    const csrfToken = match[1];
    console.log(`🔑 CSRF token: ${csrfToken}`);

    return {
        html: pageSource,
        token: csrfToken,
    };
}

/**
 * Create a mailbox for a user
 * @param driver - Selenium WebDriver instance
 * @param user - User data
 */
async function createMailbox(driver: WebDriver, user: MailcowUser): Promise<void> {
    // Get CSRF token
    const { token } = await extractCSRFToken(driver);

    await driver.executeScript((user: MailcowUser, token: string) => {
        try {
            const apiUrl = new URL('/api/v1/add/mailbox', window.location.origin).href;

            // Prepare request payload as URL encoded format
            const attrData = JSON.stringify({
                "force_pw_update": 0,
                "sogo_access": [
                    "0",
                    "1"
                ],
                "protocol_access": [
                    "0",
                    "imap",
                    "pop3",
                    "smtp",
                    "sieve"
                ],
                "local_part": user.local_part,
                "domain": user.domain,
                "name": user.name,
                "password": user.password,
                "password2": user.password,
                "tags": "",
                "quota": 0,
                "quarantine_notification": "hourly",
                "quarantine_category": "reject",
                "acl": [
                    "spam_alias",
                    "tls_policy",
                    "spam_score",
                    "spam_policy",
                    "delimiter_action",
                    "eas_reset",
                    "pushover",
                    "quarantine",
                    "quarantine_attachments",
                    "quarantine_notification",
                    "quarantine_category",
                    "app_passwds"
                ],
                "rl_value": "",
                "rl_frame": "s",
                "active": 1,
                "csrf_token": token
            });

            // Create the URL encoded string
            const formBody = new URLSearchParams();
            formBody.append('csrf_token', token);
            formBody.append('attr', attrData);

            // Make the API call using fetch with proper URL encoded format
            return fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-Token': token,
                    'Accept': 'application/json, text/javascript, */*; q=0.01',
                },
                body: formBody.toString(),
                credentials: 'same-origin'
            })
                .then(response => {
                    if (!response.ok) {
                        return response.text().then(text => {
                            throw new Error(`API request failed with status ${response.status}: ${text}`);
                        });
                    }
                    return response.json();
                })
                .then(data => {
                    console.log('API Response:', data);
                    return data;
                })
                .catch(error => {
                    console.error('Error calling mailbox API:', error);
                    throw error;
                });
        } catch (error) {
            console.error('Error creating mailbox:', error);
            throw error;
        }
    }, user, token);

    // Wait for page to redirect (may need adjustment since fetch might not trigger page navigation)
    try {
        await driver.wait(until.urlContains('/mailbox'), 3000);
        console.log(`📬 Created: ${user.local_part}@${user.domain}`);
    } catch (e) {
        // If no redirect happens with fetch, we'll just log that the request was sent
        console.log(`📬 Request sent for: ${user.local_part}@${user.domain}`);

        // Navigate to mailbox page to see results
        await driver.get(`${MAILCOW_URL}/mailbox`);
    }
}

/**
 * Main function to run the automation
 */
async function main(): Promise<void> {
    // Setup WebDriver
    const options = new chrome.Options();
    options.addArguments('--auto-open-devtools-for-tabs');
    options.addArguments('--start-maximized');

    const driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();

    try {

        // Login to Mailcow
        await login(driver);

        // Create mailboxes for all users
        for (const user of users) {
            await createMailbox(driver, user);
        }
    } catch (err) {
        console.error('❌ Error:', err instanceof Error ? err.message : String(err));
    } finally {
        await sleep(100000);
        await driver.quit();
    }
}

// Execute the main function
main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
