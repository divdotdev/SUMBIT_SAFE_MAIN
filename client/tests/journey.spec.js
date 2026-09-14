import { test, expect } from '@playwright/test';
import { pdf, documentLines } from '../../server/tests/helpers.js';
const screenshots = process.env.SCREENSHOT_DIR;
async function capture(page, name) { if(screenshots) await page.screenshot({path:`${screenshots}/${name}.png`,fullPage:true}); }
async function noOverflow(page){expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);}

test('complete real API journey: registration, loans, documents, applications, schemes and agents', async ({ page }) => {
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const email=`frontend-${Date.now()}@example.test`;
  await page.goto('/');await expect(page.getByRole('heading',{name:'Know before you submit.'})).toBeVisible();
  await expect(page.getByText('SubmitSafe Demo',{exact:true})).toBeVisible();
  await capture(page,'landing-desktop');
  await page.goto('/register');
  await page.getByLabel('Full name').fill('Test Person');await page.getByLabel('Email address').fill(email);await page.getByLabel('Password',{exact:true}).fill('Password1!');await page.getByLabel('Date of birth').fill('1995-01-01');await page.getByLabel('City (optional)').fill('Delhi');
  await page.getByRole('button',{name:'Create account',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Hello, Test.'})).toBeVisible();
  await page.goto('/profile');await page.getByRole('button',{name:'Sign out',exact:true}).click();
  await page.goto('/login');await page.getByLabel('Email address').fill(email);await page.getByLabel('Password',{exact:true}).fill('Password1!');await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Hello, Test.'})).toBeVisible();
  await page.goto('/loans');await page.getByRole('radio',{name:/Home Loan/}).check();await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByLabel('Full name').fill('Test Person');await page.getByLabel('Age',{exact:true}).fill('30');await page.getByLabel('City',{exact:true}).fill('Delhi');await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByLabel('Employment',{exact:true}).selectOption('salaried');await page.getByRole('spinbutton',{name:'Monthly income',exact:true}).fill('100000');await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByLabel('Loan amount',{exact:true}).fill('3000000');await page.getByLabel('Tenure (years)').fill('20');await page.getByLabel('Existing monthly EMI').fill('0');await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByRole('radio',{name:/750\+/}).check();await page.getByRole('button',{name:'Find Matches'}).click();
  await expect(page.getByRole('heading',{name:/We found \d+ potential matches/})).toBeVisible();
  await expect(page.locator('.loan-card')).toHaveCount(6);await capture(page,'loan-results-desktop');
  await page.locator('.loan-card').nth(0).getByRole('checkbox',{name:'Compare',exact:true}).check();await page.locator('.loan-card').nth(1).getByRole('checkbox',{name:'Compare',exact:true}).check();
  await page.getByRole('link',{name:'Compare lenders',exact:true}).click();await expect(page.getByRole('heading',{name:'A little comparison. A clearer choice.'})).toBeVisible();
  await expect(page.locator('.comparison-table tbody tr').first().locator('td')).toHaveCount(2);await capture(page,'compare-desktop');
  await page.setViewportSize({width:390,height:844});await noOverflow(page);await expect(page.locator('.comparison-mobile')).toBeVisible();await capture(page,'compare-mobile');await page.setViewportSize({width:1440,height:1000});
  await page.goto('/loans/results');await page.locator('.loan-card').first().getByRole('link',{name:'View Details'}).click();await expect(page.getByRole('heading',{name:'Costs',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Prepare Application',exact:true}).click();await expect(page.getByRole('heading',{name:'You’ve found an option. Let’s get ready.'})).toBeVisible();const prepareUrl=page.url();
  for(const [type,lines] of Object.entries(documentLines)){
    await page.goto(`/documents/upload?type=${type}`);
    await page.getByLabel('Choose document',{exact:true}).setInputFiles({name:`${type}.pdf`,mimeType:'application/pdf',buffer:pdf(lines)});
    await page.getByRole('checkbox',{name:/I consent to SubmitSafe analyzing/}).check();await page.getByRole('button',{name:'Upload & check document'}).click();
    await expect(page.getByRole('heading',{name:'Document Check Complete'})).toBeVisible();await expect(page.getByText('Looking good.',{exact:true})).toBeVisible();
    if(type==='AADHAAR'){await expect(page.getByText('XXXX XXXX 9012',{exact:true})).toBeVisible();await expect(page.locator('body')).not.toContainText('1234 5678 9012');await capture(page,'aadhaar-check');}
    if(type==='PAN'){await expect(page.getByText('ABCDE****F',{exact:true})).toBeVisible();await expect(page.locator('body')).not.toContainText('ABCDE1234F');}
  }
  await page.goto('/documents');await expect(page.getByText('4 of 4 ready',{exact:true})).toBeVisible();await expect(page.getByRole('progressbar',{name:'Readiness'})).toHaveAttribute('aria-valuenow','100');await capture(page,'documents-ready');
  await page.setViewportSize({width:390,height:844});await noOverflow(page);await capture(page,'documents-mobile');await page.setViewportSize({width:1440,height:1000});
  await page.goto(prepareUrl);await page.getByRole('link',{name:/Apply Directly/}).click();await page.getByRole('checkbox',{name:/I consent to sharing my application/}).check();await page.getByRole('button',{name:'Prepare Application',exact:true}).click();
  await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByRole('heading',{name:'Your demo application is ready.'})).toBeVisible();await expect(page.locator('.application-code strong')).toHaveText(/SS-HOME-\d{4}-\d{5}/);await capture(page,'application-success');
  await page.getByRole('link',{name:'View my application'}).click();await expect(page.getByRole('heading',{name:'Your application, at a glance.'})).toBeVisible();await expect(page.locator('.card>.section-heading')).toContainText('Submitted');
  await page.goto('/schemes');await page.getByLabel('Age',{exact:true}).fill('22');await page.getByLabel('State or union territory').selectOption('Delhi');await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByLabel('Annual income',{exact:true}).fill('200000');await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByLabel('Occupation',{exact:true}).selectOption('student');await page.getByRole('button',{name:'Find Schemes',exact:true}).click();
  await expect(page.getByRole('heading',{name:'A little support for your next step.'})).toBeVisible();await expect(page.locator('.scheme-card')).toHaveCount(16);await page.locator('.scheme-card').first().getByRole('link',{name:'View Details'}).click();await page.getByRole('button',{name:'Save scheme',exact:true}).click();
  await page.getByRole('checkbox',{name:/I consent to using my uploaded documents/}).check();await page.getByRole('button',{name:'Check Documents',exact:true}).click();await expect(page.getByText(/Your scheme document-check consent is saved/)).toBeVisible();
  await page.goto('/agents');await expect(page.locator('.agent-card')).toHaveCount(8);await page.locator('.agent-card').first().getByRole('link',{name:'View Profile'}).click();await page.getByRole('checkbox',{name:/I consent to requesting assistance/}).check();await page.getByRole('button',{name:'Request assistance'}).click();await expect(page.getByRole('heading',{name:'Your assistance request is saved.'})).toBeVisible();await page.getByRole('link',{name:'Go to my dashboard'}).click();
  await expect(page.getByRole('heading',{name:'Hello, Test.'})).toBeVisible();await expect(page.locator('.recent-code')).toHaveText(/SS-HOME/);await capture(page,'dashboard-desktop');
  await page.setViewportSize({width:390,height:844});await noOverflow(page);await capture(page,'dashboard-mobile');await page.getByRole('button',{name:'Open menu'}).click();await expect(page.getByRole('navigation',{name:'Mobile navigation'})).toBeVisible();await page.getByRole('navigation',{name:'Mobile navigation'}).getByRole('link',{name:'Settings',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Privacy & consent.'})).toBeVisible();await page.getByRole('button',{name:'Revoke',exact:true}).first().click();await expect(page.getByText('Revoked',{exact:true}).first()).toBeVisible();await noOverflow(page);
  expect(errors).toEqual([]);
});

test('mobile navigation, protected routes, unavailable products and API errors',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/');await expect(page.getByRole('heading',{name:'Know before you submit.'})).toBeVisible();await capture(page,'landing-mobile');await noOverflow(page);
  await page.getByRole('button',{name:'Open menu'}).click();await page.getByRole('navigation',{name:'Mobile navigation'}).getByRole('link',{name:'Documents',exact:true}).click();await expect(page).toHaveURL(/\/login\?next=/);
  await page.goto('/loans/personal');await expect(page.getByRole('heading',{name:'Personal Loan options are on the way.'})).toBeVisible();await noOverflow(page);
  await page.goto('/loans');await capture(page,'wizard-mobile');await noOverflow(page);
  await page.route('**/api/agents',route=>route.abort());await page.goto('/agents');await expect(page.getByText(/We can’t reach SubmitSafe right now/)).toBeVisible();await page.unroute('**/api/agents');await page.getByRole('button',{name:'Try again'}).click();await expect(page.locator('.agent-card')).toHaveCount(8);await noOverflow(page);
});
