import { Resend } from 'resend'
import mailchimp from '@mailchimp/mailchimp_marketing'
import { createHash } from 'crypto'

const FROM_EMAIL = 'Relaks <hello@relaks.app>'

// Lazy initialization to avoid build-time errors when env vars are missing
let resendClient: Resend | null = null
let mailchimpConfigured = false

function getResend(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY)
  }
  return resendClient
}

function ensureMailchimp(): void {
  if (!mailchimpConfigured) {
    mailchimp.setConfig({
      apiKey: process.env.MAILCHIMP_API_KEY,
      server: process.env.MAILCHIMP_SERVER_PREFIX,
    })
    mailchimpConfigured = true
  }
}

function getMailchimpAudienceId(): string {
  return process.env.MAILCHIMP_AUDIENCE_ID!
}

// ============================================
// TRANSACTIONAL EMAILS (Resend)
// ============================================

export async function sendWelcomeEmail(to: string, username: string) {
  try {
    const { data, error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to,
      subject: 'Welcome to Relaks!',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="background: linear-gradient(135deg, #A855F7, #EC4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 32px; margin-bottom: 20px;">
            Relaks
          </h1>

          <h2 style="color: #1f2937; font-size: 24px;">Welcome, ${username}!</h2>

          <p style="color: #4b5563; font-size: 16px; line-height: 24px;">
            We're so excited to have you join our community of colorists and creative souls.
          </p>

          <p style="color: #4b5563; font-size: 16px; line-height: 24px;">
            Here's what you can do with Relaks:
          </p>

          <ul style="color: #4b5563; font-size: 16px; line-height: 28px;">
            <li>Share your colored artwork with the community</li>
            <li>Get inspired by beautiful reference galleries</li>
            <li>Journal daily with thoughtful prompts</li>
            <li>Generate custom coloring pages with AI</li>
            <li>Climb the leaderboard and earn recognition</li>
          </ul>

          <p style="color: #4b5563; font-size: 16px; line-height: 24px;">
            You've received <strong>5 free page downloads</strong> and <strong>1 free AI generation</strong> to get started!
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="https://relaks.app/feed" style="background: linear-gradient(135deg, #A855F7, #EC4899); color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; display: inline-block;">
              Start Exploring
            </a>
          </div>

          <p style="color: #9ca3af; font-size: 14px; text-align: center; margin-top: 40px;">
            Color. Share. Relax.
          </p>
        </div>
      `,
    })

    if (error) {
      console.error('Welcome email error:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Email send error:', error)
    return { success: false, error }
  }
}

export async function sendPurchaseEmail(
  to: string,
  username: string,
  purchaseType: string,
  amount: number,
  reference: string
) {
  const purchaseLabels: Record<string, string> = {
    single: '1 Coloring Page',
    bundle: '10 Coloring Pages Bundle',
    unlimited: 'Unlimited Pages Access',
    ai_starter: '5 AI Credits',
    ai_popular: '25 AI Credits',
    ai_pro: '50 AI Credits',
  }

  const label = purchaseLabels[purchaseType] || purchaseType

  try {
    const { data, error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to,
      subject: 'Your Relaks Purchase is Confirmed!',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="background: linear-gradient(135deg, #A855F7, #EC4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 32px; margin-bottom: 20px;">
            Relaks
          </h1>

          <h2 style="color: #1f2937; font-size: 24px;">Purchase Confirmed!</h2>

          <p style="color: #4b5563; font-size: 16px;">Hi ${username},</p>

          <p style="color: #4b5563; font-size: 16px;">
            Your purchase was successful. Here are the details:
          </p>

          <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <p style="margin: 8px 0; color: #4b5563;">
              <span>Item:</span>
              <strong style="float: right;">${label}</strong>
            </p>
            <p style="margin: 8px 0; color: #4b5563;">
              <span>Amount Paid:</span>
              <strong style="float: right;">NGN ${amount.toLocaleString()}</strong>
            </p>
            <p style="margin: 8px 0; color: #4b5563; font-size: 12px;">
              <span>Reference:</span>
              <span style="float: right;">${reference}</span>
            </p>
          </div>

          <p style="color: #4b5563; font-size: 16px;">
            Your purchase is ready to use. Create something beautiful!
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="https://relaks.app/discover" style="background: linear-gradient(135deg, #A855F7, #EC4899); color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; display: inline-block;">
              Explore Now
            </a>
          </div>

          <p style="color: #9ca3af; font-size: 14px; text-align: center; margin-top: 40px;">
            Questions? Reply to this email.
          </p>
        </div>
      `,
    })

    if (error) {
      console.error('Purchase email error:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Email send error:', error)
    return { success: false, error }
  }
}

export async function sendStreakReminderEmail(to: string, username: string, currentStreak: number) {
  try {
    const { data, error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Don't break your ${currentStreak}-day streak!`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="background: linear-gradient(135deg, #A855F7, #EC4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 32px; margin-bottom: 20px;">
            Relaks
          </h1>

          <h2 style="color: #1f2937; font-size: 24px;">Your streak is at risk!</h2>

          <p style="color: #4b5563; font-size: 16px;">Hi ${username},</p>

          <p style="color: #4b5563; font-size: 16px;">
            You haven't journaled today and your <strong>${currentStreak}-day streak</strong> is about to break!
          </p>

          <p style="color: #4b5563; font-size: 16px;">
            Take 2 minutes to write something - even a few sentences counts.
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="https://relaks.app/journal" style="background: linear-gradient(135deg, #F97316, #EF4444); color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; display: inline-block;">
              Save My Streak
            </a>
          </div>

          <p style="color: #9ca3af; font-size: 14px; text-align: center;">
            You've got this!
          </p>
        </div>
      `,
    })

    if (error) {
      console.error('Streak reminder error:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Email send error:', error)
    return { success: false, error }
  }
}

export async function sendLowCreditsEmail(to: string, username: string, creditsRemaining: number) {
  try {
    const { data, error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to,
      subject: 'Running low on credits?',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="background: linear-gradient(135deg, #A855F7, #EC4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 32px; margin-bottom: 20px;">
            Relaks
          </h1>

          <h2 style="color: #1f2937; font-size: 24px;">You're running low on credits</h2>

          <p style="color: #4b5563; font-size: 16px;">Hi ${username},</p>

          <p style="color: #4b5563; font-size: 16px;">
            You only have <strong>${creditsRemaining} credits</strong> left. Top up to keep creating!
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="https://relaks.app/discover?tab=pages" style="background: linear-gradient(135deg, #A855F7, #EC4899); color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; display: inline-block;">
              Get More Credits
            </a>
          </div>
        </div>
      `,
    })

    if (error) {
      console.error('Low credits email error:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Email send error:', error)
    return { success: false, error }
  }
}

// ============================================
// MAILCHIMP SYNC (Marketing List)
// ============================================

function getSubscriberHash(email: string): string {
  return createHash('md5').update(email.toLowerCase()).digest('hex')
}

export async function addToMailchimpList(
  email: string,
  firstName: string,
  tags: string[] = ['app_user']
) {
  try {
    ensureMailchimp()
    const response = await mailchimp.lists.addListMember(getMailchimpAudienceId(), {
      email_address: email,
      status: 'subscribed' as const,
      merge_fields: {
        FNAME: firstName,
        SOURCE: 'relaks_app',
      },
      tags,
    })

    console.log('Added to Mailchimp:', email)
    return { success: true, data: response }
  } catch (error: unknown) {
    const mailchimpError = error as { status?: number; response?: { body?: { title?: string } } }

    // Handle "already subscribed" gracefully
    if (
      mailchimpError.status === 400 &&
      mailchimpError.response?.body?.title === 'Member Exists'
    ) {
      console.log('Already in Mailchimp:', email)

      // Update their tags instead
      try {
        const subscriberHash = getSubscriberHash(email)
        await mailchimp.lists.updateListMemberTags(
          getMailchimpAudienceId(),
          subscriberHash,
          {
            tags: tags.map(tag => ({ name: tag, status: 'active' as const })),
          }
        )
        return { success: true, alreadyExists: true }
      } catch (tagError) {
        console.error('Failed to update Mailchimp tags:', tagError)
      }
    }

    console.error('Mailchimp error:', error)
    return { success: false, error }
  }
}

export async function updateMailchimpTags(email: string, tags: string[]) {
  try {
    ensureMailchimp()
    const subscriberHash = getSubscriberHash(email)

    await mailchimp.lists.updateListMemberTags(
      getMailchimpAudienceId(),
      subscriberHash,
      {
        tags: tags.map(tag => ({ name: tag, status: 'active' as const })),
      }
    )

    return { success: true }
  } catch (error) {
    console.error('Mailchimp tag update error:', error)
    return { success: false, error }
  }
}

// ============================================
// COMBINED: New User Signup
// ============================================

export async function handleNewUserEmails(email: string, username: string) {
  // Send welcome email via Resend (instant)
  const welcomeResult = await sendWelcomeEmail(email, username)

  // Add to Mailchimp list (for future campaigns)
  const mailchimpResult = await addToMailchimpList(email, username, [
    'app_user',
    'new_signup',
  ])

  return {
    welcome: welcomeResult,
    mailchimp: mailchimpResult,
  }
}

// Add tag when user makes first purchase
export async function handleFirstPurchase(email: string) {
  await updateMailchimpTags(email, ['paying_customer'])
}

// Add tag when user reaches milestones
export async function handleMilestone(email: string, milestone: string) {
  await updateMailchimpTags(email, [milestone])
}
