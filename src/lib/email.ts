import { Resend } from 'resend'
import mailchimp from '@mailchimp/mailchimp_marketing'
import { createHash } from 'crypto'

const FROM_EMAIL = 'Clara from Relaks <hello@hello.relaks.co>'

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
      subject: "I'm so glad you're here",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <p>Hey ${username},</p>

          <p><strong>I'm so glad you're here.</strong></p>

          <p>Relaks started from a deeply personal place. My own journey through grief and anxiety after losing my mum. Coloring became my way of processing emotions I couldn't put into words. It gave me something I didn't know I needed: permission to slow down.</p>

          <p>That's what I wanted to build for you too.</p>

          <p>Not just an app. A space where you feel considered. Where every detail is designed to help you feel a little lighter.</p>

          <p>You don't need to be artistic. You don't need to have it all figured out. You just need to show up for yourself.</p>

          <p>So whenever life feels loud, know that Relaks is here. Waiting. Ready. No pressure.</p>

          <p>Start with something that excites you — maybe a color reference, maybe an AI-generated page, maybe just exploring.</p>

          <p><a href="https://relaks.co/feed">Start Exploring</a></p>

          <p><em>This is your space now.</em></p>

          <p>With love,<br>
          <strong>Clara</strong><br>
          <span style="color: #999;">Founder, Relaks</span></p>
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
            <a href="https://relaks.co/discover" style="background: linear-gradient(135deg, #A855F7, #EC4899); color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; display: inline-block;">
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
            <a href="https://relaks.co/journal" style="background: linear-gradient(135deg, #F97316, #EF4444); color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; display: inline-block;">
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
            <a href="https://relaks.co/discover?tab=pages" style="background: linear-gradient(135deg, #A855F7, #EC4899); color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; display: inline-block;">
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

// ============================================
// BLOG POST NOTIFICATIONS
// ============================================

export async function sendNewBlogPostEmail(
  to: string,
  username: string,
  postTitle: string,
  postExcerpt: string,
  postSlug: string,
  coverImageUrl: string | null
) {
  try {
    const coverHtml = coverImageUrl
      ? `<img src="${coverImageUrl}" alt="${postTitle}" style="width: 100%; max-height: 280px; object-fit: cover; border-radius: 12px; margin-bottom: 24px;" />`
      : ''

    const { data, error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to,
      subject: `New on Relaks: ${postTitle}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="background: linear-gradient(135deg, #A855F7, #EC4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 32px; margin-bottom: 24px;">
            Relaks
          </h1>

          <p style="color: #4b5563; font-size: 16px;">Hi ${username},</p>

          <p style="color: #4b5563; font-size: 16px;">
            We just published something new on the blog:
          </p>

          ${coverHtml}

          <h2 style="color: #1f2937; font-size: 22px; margin-bottom: 8px;">${postTitle}</h2>

          <p style="color: #6b7280; font-size: 15px; line-height: 1.6;">
            ${postExcerpt}
          </p>

          <div style="text-align: center; margin: 32px 0;">
            <a href="https://relaks.co/blog/${postSlug}" style="background: linear-gradient(135deg, #A855F7, #EC4899); color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; display: inline-block;">
              Read Now
            </a>
          </div>

          <p style="color: #9ca3af; font-size: 13px; text-align: center; margin-top: 40px;">
            You're receiving this because you have a Relaks account.
          </p>
        </div>
      `,
    })

    if (error) {
      console.error('Blog notification email error:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Blog notification send error:', error)
    return { success: false, error }
  }
}

export async function notifyUsersOfNewPost(
  users: { email: string; display_name: string | null; username: string }[],
  postTitle: string,
  postExcerpt: string,
  postSlug: string,
  coverImageUrl: string | null
) {
  const BATCH_SIZE = 100

  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE)

    const emails = batch.map((user) => {
      const name = user.display_name || user.username
      const coverHtml = coverImageUrl
        ? `<img src="${coverImageUrl}" alt="${postTitle}" style="width: 100%; max-height: 280px; object-fit: cover; border-radius: 12px; margin-bottom: 24px;" />`
        : ''

      return {
        from: FROM_EMAIL,
        to: user.email,
        subject: `New on Relaks: ${postTitle}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="background: linear-gradient(135deg, #A855F7, #EC4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 32px; margin-bottom: 24px;">
              Relaks
            </h1>

            <p style="color: #4b5563; font-size: 16px;">Hi ${name},</p>

            <p style="color: #4b5563; font-size: 16px;">
              We just published something new on the blog:
            </p>

            ${coverHtml}

            <h2 style="color: #1f2937; font-size: 22px; margin-bottom: 8px;">${postTitle}</h2>

            <p style="color: #6b7280; font-size: 15px; line-height: 1.6;">
              ${postExcerpt}
            </p>

            <div style="text-align: center; margin: 32px 0;">
              <a href="https://relaks.co/blog/${postSlug}" style="background: linear-gradient(135deg, #A855F7, #EC4899); color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; display: inline-block;">
                Read Now
              </a>
            </div>

            <p style="color: #9ca3af; font-size: 13px; text-align: center; margin-top: 40px;">
              You're receiving this because you have a Relaks account.
            </p>
          </div>
        `,
      }
    })

    try {
      await getResend().batch.send(emails)
      console.log(`Blog notification batch sent: ${emails.length} emails (batch ${Math.floor(i / BATCH_SIZE) + 1})`)
    } catch (error) {
      console.error(`Blog notification batch error (batch ${Math.floor(i / BATCH_SIZE) + 1}):`, error)
    }
  }
}

// Add tag when user makes first purchase
export async function handleFirstPurchase(email: string) {
  await updateMailchimpTags(email, ['paying_customer'])
}

// ============================================
// RENTAL CONFIRMATION EMAIL
// ============================================

export async function sendRentalConfirmationEmail(
  to: string,
  username: string,
  planName: string,
  books: { id: string; title: string; author: string; cover_url: string | null }[],
  deliveryAddress: string,
  deliveryLga: string,
  expiresAt: string,
  swapFrequency: 'monthly' | 'end_of_term'
) {
  const expiresDate = new Date(expiresAt)
  const formattedDate = expiresDate.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const bookListHtml = books
    .map(
      (book) => `
      <div style="display: inline-block; margin-right: 12px; text-align: center; width: 80px;">
        ${
          book.cover_url
            ? `<img src="${book.cover_url}" alt="${book.title}" style="width: 60px; height: 90px; object-fit: cover; border-radius: 8px; margin-bottom: 4px;" />`
            : `<div style="width: 60px; height: 90px; background: #f3f4f6; border-radius: 8px; margin-bottom: 4px;"></div>`
        }
        <p style="font-size: 11px; color: #4b5563; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${book.title}</p>
      </div>
    `
    )
    .join('')

  const keyDateMessage =
    swapFrequency === 'monthly'
      ? `We'll come swap your books around <strong>${formattedDate}</strong>`
      : `These books are yours until <strong>${formattedDate}</strong>`

  try {
    const { data, error } = await getResend().emails.send({
      from: 'Relaks <hello@hello.relaks.co>',
      to,
      subject: 'Your books are on their way!',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #FFFBF5;">
          <h1 style="background: linear-gradient(135deg, #A855F7, #EC4899, #F97316); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 32px; margin-bottom: 24px;">
            Relaks
          </h1>

          <h2 style="color: #1f2937; font-size: 24px; margin-bottom: 8px;">Your books are on their way!</h2>

          <p style="color: #4b5563; font-size: 16px; margin-bottom: 24px;">
            Hey ${username}, we're so excited to get these books to you.
          </p>

          <div style="background: white; border-radius: 16px; padding: 24px; margin-bottom: 24px; border: 1px solid #f3f4f6;">
            <p style="color: #6b7280; font-size: 14px; margin-bottom: 12px;">Your books:</p>
            <div style="overflow-x: auto; white-space: nowrap; padding-bottom: 8px;">
              ${bookListHtml}
            </div>
          </div>

          <div style="background: white; border-radius: 16px; padding: 24px; margin-bottom: 24px; border: 1px solid #f3f4f6;">
            <p style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">Delivering to:</p>
            <p style="color: #1f2937; font-size: 16px; font-weight: 600; margin: 0;">
              ${deliveryAddress}, ${deliveryLga}
            </p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 16px; margin-bottom: 8px;">Expected delivery:</p>
            <p style="color: #1f2937; font-size: 16px; font-weight: 600; margin: 0;">
              Within 2-4 days
            </p>
          </div>

          <div style="background: linear-gradient(135deg, #faf5ff, #fdf2f8); border-radius: 16px; padding: 20px; margin-bottom: 24px;">
            <p style="color: #4b5563; font-size: 15px; margin: 0;">
              ${keyDateMessage}
            </p>
          </div>

          <div style="text-align: center; margin: 32px 0;">
            <a href="https://relaks.co/rent/my-rentals" style="background: linear-gradient(135deg, #A855F7, #EC4899, #F97316); color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; display: inline-block;">
              View My Rentals
            </a>
          </div>

          <p style="color: #9ca3af; font-size: 13px; text-align: center; margin-top: 40px;">
            Happy reading!<br>
            The Relaks Team
          </p>
        </div>
      `,
    })

    if (error) {
      console.error('Rental confirmation email error:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Rental confirmation email send error:', error)
    return { success: false, error }
  }
}

// Add tag when user reaches milestones
export async function handleMilestone(email: string, milestone: string) {
  await updateMailchimpTags(email, [milestone])
}

// ============================================
// RENTAL LIFECYCLE EMAILS
// ============================================

/**
 * Sent when books are delivered to the customer
 * Marks the start of their rental countdown
 */
export async function sendDeliveryConfirmationEmail(
  to: string,
  username: string,
  planName: string,
  durationDays: number,
  expiresAt: string
) {
  const expiresDate = new Date(expiresAt)
  const formattedDate = expiresDate.toLocaleDateString('en-NG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  try {
    const { data, error } = await getResend().emails.send({
      from: 'Relaks <hello@hello.relaks.co>',
      to,
      subject: 'Your books have arrived! 📚',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #FFFBF5;">
          <h1 style="background: linear-gradient(135deg, #A855F7, #EC4899, #F97316); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 32px; margin-bottom: 24px;">
            Relaks
          </h1>

          <h2 style="color: #1f2937; font-size: 24px; margin-bottom: 8px;">Your books have arrived! 📚</h2>

          <p style="color: #4b5563; font-size: 16px; margin-bottom: 24px;">
            Hey ${username}, your books are now in your hands. Your ${durationDays}-day reading adventure starts today!
          </p>

          <div style="background: white; border-radius: 16px; padding: 24px; margin-bottom: 24px; border: 1px solid #f3f4f6;">
            <p style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">Your reading period:</p>
            <p style="color: #1f2937; font-size: 20px; font-weight: 700; margin: 0;">
              ${durationDays} days
            </p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 16px; margin-bottom: 8px;">We'll collect your books on:</p>
            <p style="color: #c05621; font-size: 18px; font-weight: 600; margin: 0;">
              ${formattedDate}
            </p>
          </div>

          <div style="background: linear-gradient(135deg, #faf5ff, #fdf2f8); border-radius: 16px; padding: 20px; margin-bottom: 24px;">
            <p style="color: #4b5563; font-size: 15px; margin: 0;">
              💡 <strong>Tip:</strong> Enable auto-renew in your account to keep the books flowing without interruption!
            </p>
          </div>

          <div style="text-align: center; margin: 32px 0;">
            <a href="https://relaks.co/rent/my-rentals" style="background: linear-gradient(135deg, #A855F7, #EC4899, #F97316); color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; display: inline-block;">
              View My Rentals
            </a>
          </div>

          <p style="color: #9ca3af; font-size: 13px; text-align: center; margin-top: 40px;">
            Happy reading!<br>
            The Relaks Team
          </p>
        </div>
      `,
    })

    if (error) {
      console.error('[sendDeliveryConfirmationEmail] Error:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('[sendDeliveryConfirmationEmail] Send error:', error)
    return { success: false, error }
  }
}

/**
 * Sent 7 days before rental expires
 * Encourages renewal or lets them know collection is coming
 */
export async function sendRenewalReminderEmail(
  to: string,
  username: string,
  expiresAt: string,
  autoRenewEnabled: boolean,
  planPrice: number
) {
  const expiresDate = new Date(expiresAt)
  const formattedDate = expiresDate.toLocaleDateString('en-NG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const autoRenewMessage = autoRenewEnabled
    ? `<p style="color: #059669; font-size: 15px; margin: 0;">
        ✅ <strong>Auto-renew is ON</strong> — We'll charge your saved card (₦${planPrice.toLocaleString()}) on ${formattedDate} and your books will keep coming!
      </p>`
    : `<p style="color: #4b5563; font-size: 15px; margin: 0;">
        Want to keep reading? Enable auto-renew or renew manually before ${formattedDate}.
      </p>`

  try {
    const { data, error } = await getResend().emails.send({
      from: 'Relaks <hello@hello.relaks.co>',
      to,
      subject: '7 days left on your rental 📖',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #FFFBF5;">
          <h1 style="background: linear-gradient(135deg, #A855F7, #EC4899, #F97316); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 32px; margin-bottom: 24px;">
            Relaks
          </h1>

          <h2 style="color: #1f2937; font-size: 24px; margin-bottom: 8px;">7 days left on your rental</h2>

          <p style="color: #4b5563; font-size: 16px; margin-bottom: 24px;">
            Hey ${username}, your current rental period ends on <strong>${formattedDate}</strong>.
          </p>

          <div style="background: white; border-radius: 16px; padding: 24px; margin-bottom: 24px; border: 1px solid #f3f4f6;">
            ${autoRenewMessage}
          </div>

          ${!autoRenewEnabled ? `
          <div style="background: linear-gradient(135deg, #faf5ff, #fdf2f8); border-radius: 16px; padding: 20px; margin-bottom: 24px;">
            <p style="color: #4b5563; font-size: 15px; margin: 0 0 16px 0;">
              <strong>Two options:</strong>
            </p>
            <p style="color: #4b5563; font-size: 14px; margin: 0 0 8px 0;">
              1. <strong>Turn on auto-renew</strong> — Never run out of books
            </p>
            <p style="color: #4b5563; font-size: 14px; margin: 0;">
              2. <strong>Renew manually</strong> — Pick new books now
            </p>
          </div>

          <div style="text-align: center; margin: 32px 0;">
            <a href="https://relaks.co/rent/my-rentals" style="background: linear-gradient(135deg, #A855F7, #EC4899, #F97316); color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; display: inline-block;">
              Renew Now
            </a>
          </div>
          ` : `
          <div style="text-align: center; margin: 32px 0;">
            <a href="https://relaks.co/rent/my-rentals" style="background: linear-gradient(135deg, #A855F7, #EC4899, #F97316); color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; display: inline-block;">
              View My Rentals
            </a>
          </div>
          `}

          <p style="color: #9ca3af; font-size: 13px; text-align: center; margin-top: 40px;">
            Questions? Just reply to this email.<br>
            The Relaks Team
          </p>
        </div>
      `,
    })

    if (error) {
      console.error('[sendRenewalReminderEmail] Error:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('[sendRenewalReminderEmail] Send error:', error)
    return { success: false, error }
  }
}

/**
 * Sent when auto-renewal charge succeeds
 */
export async function sendAutoRenewalSuccessEmail(
  to: string,
  username: string,
  planName: string,
  amountCharged: number,
  newExpiresAt: string,
  subscriptionId: string
) {
  const expiresDate = new Date(newExpiresAt)
  const formattedDate = expiresDate.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  try {
    const { data, error } = await getResend().emails.send({
      from: 'Relaks <hello@hello.relaks.co>',
      to,
      subject: 'Your rental has been renewed! 🎉',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #FFFBF5;">
          <h1 style="background: linear-gradient(135deg, #A855F7, #EC4899, #F97316); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 32px; margin-bottom: 24px;">
            Relaks
          </h1>

          <h2 style="color: #1f2937; font-size: 24px; margin-bottom: 8px;">Your rental has been renewed! 🎉</h2>

          <p style="color: #4b5563; font-size: 16px; margin-bottom: 24px;">
            Hey ${username}, great news! We've automatically renewed your ${planName} subscription.
          </p>

          <div style="background: white; border-radius: 16px; padding: 24px; margin-bottom: 24px; border: 1px solid #f3f4f6;">
            <p style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">Amount charged:</p>
            <p style="color: #1f2937; font-size: 20px; font-weight: 700; margin: 0 0 16px 0;">
              ₦${amountCharged.toLocaleString()}
            </p>
            <p style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">Your next books are yours until:</p>
            <p style="color: #059669; font-size: 18px; font-weight: 600; margin: 0;">
              ${formattedDate}
            </p>
          </div>

          <div style="background: linear-gradient(135deg, #ecfdf5, #d1fae5); border-radius: 16px; padding: 20px; margin-bottom: 24px;">
            <p style="color: #065f46; font-size: 15px; margin: 0;">
              📚 <strong>Next step:</strong> Pick your books for this cycle! We'll deliver them when we collect your current books.
            </p>
          </div>

          <div style="text-align: center; margin: 32px 0;">
            <a href="https://relaks.co/books?subscription=${subscriptionId}" style="background: linear-gradient(135deg, #A855F7, #EC4899, #F97316); color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; display: inline-block;">
              Pick Your Books
            </a>
          </div>

          <p style="color: #9ca3af; font-size: 13px; text-align: center; margin-top: 40px;">
            Happy reading!<br>
            The Relaks Team
          </p>
        </div>
      `,
    })

    if (error) {
      console.error('[sendAutoRenewalSuccessEmail] Error:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('[sendAutoRenewalSuccessEmail] Send error:', error)
    return { success: false, error }
  }
}

/**
 * Sent when auto-renewal charge fails
 */
export async function sendAutoRenewalFailedEmail(
  to: string,
  username: string,
  planName: string,
  planPrice: number,
  subscriptionId: string
) {
  try {
    const { data, error } = await getResend().emails.send({
      from: 'Relaks <hello@hello.relaks.co>',
      to,
      subject: 'Your renewal payment failed',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #FFFBF5;">
          <h1 style="background: linear-gradient(135deg, #A855F7, #EC4899, #F97316); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 32px; margin-bottom: 24px;">
            Relaks
          </h1>

          <h2 style="color: #1f2937; font-size: 24px; margin-bottom: 8px;">Your renewal payment failed</h2>

          <p style="color: #4b5563; font-size: 16px; margin-bottom: 24px;">
            Hey ${username}, we tried to renew your ${planName} subscription but the payment didn't go through.
          </p>

          <div style="background: #fef2f2; border-radius: 16px; padding: 24px; margin-bottom: 24px; border: 1px solid #fecaca;">
            <p style="color: #991b1b; font-size: 15px; margin: 0;">
              ⚠️ Your saved card was declined. This could be due to insufficient funds, an expired card, or a temporary bank issue.
            </p>
          </div>

          <div style="background: white; border-radius: 16px; padding: 24px; margin-bottom: 24px; border: 1px solid #f3f4f6;">
            <p style="color: #4b5563; font-size: 15px; margin: 0;">
              Don't worry — you can still renew manually and keep the books coming:
            </p>
          </div>

          <div style="text-align: center; margin: 32px 0;">
            <a href="https://relaks.co/rent/my-rentals" style="background: linear-gradient(135deg, #A855F7, #EC4899, #F97316); color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; display: inline-block;">
              Renew Now (₦${planPrice.toLocaleString()})
            </a>
          </div>

          <p style="color: #9ca3af; font-size: 13px; text-align: center; margin-top: 40px;">
            If you have any issues, just reply to this email.<br>
            The Relaks Team
          </p>
        </div>
      `,
    })

    if (error) {
      console.error('[sendAutoRenewalFailedEmail] Error:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('[sendAutoRenewalFailedEmail] Send error:', error)
    return { success: false, error }
  }
}

/**
 * Sent when rental expires and collection is scheduled
 */
export async function sendCollectionScheduledEmail(
  to: string,
  username: string
) {
  try {
    const { data, error } = await getResend().emails.send({
      from: 'Relaks <hello@hello.relaks.co>',
      to,
      subject: 'Time to say goodbye to your books 📚',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #FFFBF5;">
          <h1 style="background: linear-gradient(135deg, #A855F7, #EC4899, #F97316); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 32px; margin-bottom: 24px;">
            Relaks
          </h1>

          <h2 style="color: #1f2937; font-size: 24px; margin-bottom: 8px;">Time to say goodbye to your books</h2>

          <p style="color: #4b5563; font-size: 16px; margin-bottom: 24px;">
            Hey ${username}, your rental period has ended. We hope you enjoyed the books!
          </p>

          <div style="background: white; border-radius: 16px; padding: 24px; margin-bottom: 24px; border: 1px solid #f3f4f6;">
            <p style="color: #4b5563; font-size: 15px; margin: 0 0 16px 0;">
              📦 <strong>What happens next:</strong>
            </p>
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              Our rider will reach out to schedule a convenient time to collect your books. Please have them ready!
            </p>
          </div>

          <div style="background: linear-gradient(135deg, #faf5ff, #fdf2f8); border-radius: 16px; padding: 20px; margin-bottom: 24px;">
            <p style="color: #4b5563; font-size: 15px; margin: 0;">
              🔄 <strong>Want to keep reading?</strong> You can start a new rental anytime!
            </p>
          </div>

          <div style="text-align: center; margin: 32px 0;">
            <a href="https://relaks.co/rent" style="background: linear-gradient(135deg, #A855F7, #EC4899, #F97316); color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; display: inline-block;">
              Start a New Rental
            </a>
          </div>

          <p style="color: #9ca3af; font-size: 13px; text-align: center; margin-top: 40px;">
            Thanks for being part of the Relaks Reading Club!<br>
            The Relaks Team
          </p>
        </div>
      `,
    })

    if (error) {
      console.error('[sendCollectionScheduledEmail] Error:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('[sendCollectionScheduledEmail] Send error:', error)
    return { success: false, error }
  }
}

// ============================================
// RENTAL OPS ALERT EMAIL (Internal)
// ============================================

export async function sendNewOrderAlertEmail(
  orderId: string,
  customerName: string,
  customerUsername: string,
  customerPhone: string,
  deliveryAddress: string,
  deliveryLga: string,
  planName: string,
  bookTitles: string[],
  amountPaid: number,
  paymentReference: string
) {
  // Parse RENTAL_OPS_EMAILS - comma-separated list
  const opsEmailsRaw = process.env.RENTAL_OPS_EMAILS

  if (!opsEmailsRaw || opsEmailsRaw.trim() === '') {
    console.warn('[sendNewOrderAlertEmail] RENTAL_OPS_EMAILS not set - skipping ops notification')
    return { success: false, skipped: true }
  }

  const opsEmails = opsEmailsRaw
    .split(',')
    .map(e => e.trim())
    .filter(e => e.length > 0 && e.includes('@'))

  if (opsEmails.length === 0) {
    console.warn('[sendNewOrderAlertEmail] No valid emails in RENTAL_OPS_EMAILS - skipping ops notification')
    return { success: false, skipped: true }
  }

  const orderTime = new Date().toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  const bookList = bookTitles.map(t => `• ${t}`).join('\n')
  const orderUrl = `https://relaks.co/club-admin/orders/${orderId}`

  // Plain text body for easy WhatsApp copy-paste
  const plainTextBody = `
NEW RENTAL ORDER
================

Customer: ${customerName} (@${customerUsername})
Phone: ${customerPhone}

DELIVERY
--------
${deliveryAddress}
${deliveryLga.toUpperCase()}

PLAN: ${planName}
Amount: ₦${amountPaid.toLocaleString()}

BOOKS:
${bookList}

Order Time: ${orderTime}
Ref: ${paymentReference}

View Order: ${orderUrl}
`.trim()

  try {
    const { data, error } = await getResend().emails.send({
      from: 'Relaks Orders <hello@hello.relaks.co>',
      to: opsEmails,
      subject: `📦 New order — ${planName} — ${customerName} (${deliveryLga})`,
      text: plainTextBody,
      html: `
        <div style="font-family: monospace; font-size: 14px; line-height: 1.6; max-width: 500px; padding: 16px;">
          <h2 style="margin: 0 0 16px 0; font-size: 18px;">📦 NEW RENTAL ORDER</h2>

          <p style="margin: 0;"><strong>Customer:</strong> ${customerName} (@${customerUsername})</p>
          <p style="margin: 0;"><strong>Phone:</strong> ${customerPhone}</p>

          <hr style="border: none; border-top: 1px solid #ccc; margin: 16px 0;" />

          <p style="margin: 0; font-size: 12px; color: #666;">DELIVERY</p>
          <p style="margin: 4px 0; font-size: 16px;"><strong>${deliveryAddress}</strong></p>
          <p style="margin: 0; font-size: 18px; font-weight: bold; color: #c05621;">${deliveryLga.toUpperCase()}</p>

          <hr style="border: none; border-top: 1px solid #ccc; margin: 16px 0;" />

          <p style="margin: 0;"><strong>Plan:</strong> ${planName}</p>
          <p style="margin: 0;"><strong>Amount:</strong> ₦${amountPaid.toLocaleString()}</p>

          <p style="margin: 16px 0 8px 0; font-size: 12px; color: #666;">BOOKS:</p>
          <ul style="margin: 0; padding-left: 20px;">
            ${bookTitles.map(t => `<li>${t}</li>`).join('')}
          </ul>

          <hr style="border: none; border-top: 1px solid #ccc; margin: 16px 0;" />

          <p style="margin: 0; font-size: 12px; color: #666;">Order Time: ${orderTime}</p>
          <p style="margin: 0; font-size: 12px; color: #666;">Ref: ${paymentReference}</p>

          <p style="margin: 20px 0;">
            <a href="${orderUrl}" style="background: #c05621; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Order
            </a>
          </p>
        </div>
      `,
    })

    if (error) {
      console.error('[sendNewOrderAlertEmail] Error:', error)
      return { success: false, error }
    }

    console.log('[sendNewOrderAlertEmail] Sent to:', opsEmails.join(', '))
    return { success: true, data }
  } catch (error) {
    console.error('[sendNewOrderAlertEmail] Send error:', error)
    return { success: false, error }
  }
}
