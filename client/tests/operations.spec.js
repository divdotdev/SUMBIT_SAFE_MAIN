import { test, expect } from '@playwright/test';
import { pdf } from '../../server/tests/helpers.js';
import { homeDocumentLines } from '../../server/tests/homeFixtures.js';
const capture=async(page,name)=>{if(process.env.DEVELOPER3_SCREENSHOTS){await page.getByRole('heading',{level:1}).first().focus();await page.screenshot({path:`${process.env.DEVELOPER3_SCREENSHOTS}/${name}.png`,fullPage:true,animations:'disabled'});}};
const noOverflow=async page=>expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
async function login(page,email,next='/dashboard') {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);await page.getByLabel('Email address').fill(email);await page.getByLabel('Password',{exact:true}).fill('Demo@123');await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page).toHaveURL(new RegExp(next+'$'));
}
test('Rahul Home presentation through consented partner lead, admin management and revocation',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await login(page,'rahul@submitsafe.in');
  await page.goto('/admin');await expect(page.getByText('This area needs a different account.')).toBeVisible();
  await page.goto('/loans/home');
  await page.getByLabel('Full name').fill('Rahul Sharma');await page.getByLabel('Age',{exact:true}).fill('28');await page.getByLabel('City',{exact:true}).fill('Chandigarh');await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByLabel('Employment',{exact:true}).selectOption('salaried');await page.getByRole('spinbutton',{name:'Monthly income',exact:true}).fill('70000');await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByLabel('Loan amount',{exact:true}).fill('2500000');await page.getByLabel('Tenure (years)').fill('20');await page.getByLabel('Existing monthly EMI').fill('5000');await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByRole('radio',{name:/750\+/}).check();await page.getByRole('button',{name:'Find Matches'}).click();await expect(page.locator('.loan-card')).toHaveCount(6);
  for(let i=0;i<3;i++)await page.locator('.loan-card').nth(i).getByRole('checkbox',{name:'Compare',exact:true}).check();
  await page.getByRole('link',{name:'Compare lenders',exact:true}).click();await expect(page.locator('.comparison-table tbody tr').first().locator('td')).toHaveCount(3);
  await page.goto('/loans/results');await page.locator('.loan-card').first().getByRole('link',{name:'View Details'}).click();await expect(page.getByRole('heading',{name:'Costs',exact:true})).toBeVisible();await page.getByRole('link',{name:'Prepare Application',exact:true}).click();await expect(page.getByRole('heading',{name:'You’ve found an option. Let’s get ready.'})).toBeVisible();
  const prepareUrl=page.url();
  for(const [type,lines] of Object.entries(homeDocumentLines)) {
    await page.goto(`/documents/upload?type=${type}`);await page.getByLabel('Choose document',{exact:true}).setInputFiles({name:`SYNTHETIC_${type}.pdf`,mimeType:'application/pdf',buffer:pdf(lines)});
    await page.getByRole('checkbox',{name:/I consent to SubmitSafe analyzing/}).check();await page.getByRole('button',{name:'Upload & check document'}).click();
    await expect(page.getByText('Looking good.',{exact:true})).toBeVisible();
    if(type==='AADHAAR'){await expect(page.getByText('XXXX XXXX 4821',{exact:true})).toBeVisible();await expect(page.getByText('SOURCE_NOT_VERIFIED',{exact:true})).toBeVisible();await expect(page.getByText('Government identity format',{exact:true})).toBeVisible();await capture(page,'rahul-aadhaar');}
    if(type==='PAN'){await expect(page.getByText('ABCDE****F',{exact:true})).toBeVisible();await expect(page.locator('body')).not.toContainText('ABCDE1234F');}
  }
  await page.goto('/documents');await expect(page.getByText('4 of 4 ready',{exact:true})).toBeVisible();await capture(page,'rahul-ready');
  await page.goto(prepareUrl);await page.getByRole('link',{name:/Apply Directly/}).click();await page.getByRole('checkbox',{name:/I consent to sharing my application/}).check();await page.getByRole('button',{name:'Prepare Application',exact:true}).click();
  await page.getByRole('link',{name:'View my application'}).click();await expect(page.getByRole('heading',{name:'Your application, at a glance.'})).toBeVisible();const appId=page.url().split('/').at(-1);
  await page.goto('/agents');await page.locator('.agent-card').first().getByRole('link',{name:'View Profile'}).click();await page.getByRole('checkbox',{name:/I consent to requesting assistance/}).check();await page.getByRole('button',{name:'Request assistance'}).click();await expect(page.getByText('Your assistance request is saved.',{exact:true})).toBeVisible();
  await login(page,'partner@submitsafe.in','/partner');await expect(page.getByText('DEMO PARTNER PORTAL',{exact:true})).toBeVisible();await expect(page.getByText('DEMO METRICS',{exact:true})).toBeVisible();await capture(page,'partner-overview');
  await page.goto(`/partner/leads/${appId}`);await expect(page.getByRole('heading',{name:'Rahul Sharma',exact:true})).toBeVisible();await expect(page.getByText('User consented to share with this lender',{exact:true})).toBeVisible();await expect(page.locator('body')).not.toContainText('ABCDE');await expect(page.locator('body')).not.toContainText('4821');await capture(page,'partner-lead');
  await page.getByRole('button',{name:'Accept Lead',exact:true}).click();await expect(page.getByRole('button',{name:'Mark Under Review',exact:true})).toBeVisible();await page.getByRole('button',{name:'Mark Under Review',exact:true}).click();await expect(page.getByRole('button',{name:'Mark Completed',exact:true})).toBeVisible();
  await page.setViewportSize({width:390,height:844});await noOverflow(page);await capture(page,'partner-mobile');await page.goto('/partner/leads');await expect(page.getByRole('table')).toBeVisible();await noOverflow(page);await page.setViewportSize({width:1440,height:1000});
  await login(page,'admin@submitsafe.in','/admin');await expect(page.getByText('Total Users',{exact:true})).toBeVisible();await capture(page,'admin-overview');
  for(const section of ['users','applications','documents','consents','audit']){await page.goto(`/admin/${section}`);await expect(page.getByRole('table')).toBeVisible();}
  await page.goto('/admin/loans');await page.getByRole('button',{name:'Create lender',exact:true}).click();await page.getByLabel('Name',{exact:true}).fill('Presentation Demo Lender');await page.getByRole('button',{name:'Save record',exact:true}).click();await expect(page.getByRole('dialog')).not.toBeVisible();
  const loanRow=page.getByRole('row').filter({hasText:'Presentation Demo Lender'});await loanRow.getByRole('button',{name:'Edit',exact:true}).click();await page.getByRole('checkbox',{name:'Enabled in the public demo catalog'}).uncheck();await page.getByRole('button',{name:'Save record',exact:true}).click();await expect(loanRow).toContainText('Disabled');
  await page.goto('/admin/schemes');await page.getByRole('button',{name:'Create scheme',exact:true}).click();await page.getByLabel('Name',{exact:true}).fill('Presentation Demo Scheme');await page.getByRole('checkbox',{name:'Enabled in the public demo catalog'}).uncheck();await page.getByRole('button',{name:'Save record',exact:true}).click();await expect(page.getByRole('dialog')).not.toBeVisible();await expect(page.getByRole('row').filter({hasText:'Presentation Demo Scheme'})).toContainText('Disabled');
  await page.goto('/admin/agents');await page.getByRole('button',{name:'Verify demo agent',exact:true}).first().click();await expect(page.getByText('Demo verified',{exact:true}).first()).toBeVisible();await expect(page.getByRole('heading',{name:'Assistance requests',exact:true})).toBeVisible();
  await page.setViewportSize({width:390,height:844});await noOverflow(page);await page.goto('/admin');await expect(page.getByText('Total Users',{exact:true})).toBeVisible();await noOverflow(page);await capture(page,'admin-mobile');await page.setViewportSize({width:1440,height:1000});
  await login(page,'rahul@submitsafe.in');await page.goto('/settings');const lenderConsent=page.locator('.consent-row').filter({hasText:/Lender application sharing/i});
  // Locate the exact lender purpose in the existing settings UI, then revoke it.
  await expect(lenderConsent).toHaveCount(1);await lenderConsent.getByRole('button',{name:'Revoke',exact:true}).click();await expect(lenderConsent).toContainText('Revoked');
  await login(page,'partner@submitsafe.in','/partner');await page.goto(`/partner/leads/${appId}`);await expect(page.getByText(/Lead is unavailable or its lender-sharing consent has ended/)).toBeVisible();
  expect(errors).toEqual([]);
});
