import { Resend } from 'resend';

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

const FROM = process.env.EMAIL_FROM || 'noreply@ghar.food';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://ghar.food';

export async function sendOrderConfirmation({ customer, order, chef, menu }) {
  const resend = getResend();
  if (!resend) {
    console.warn('Resend not configured – skipping email');
    return;
  }

  await resend.emails.send({
    from: FROM,
    to: customer.email,
    subject: `✅ Order Confirmed – ${chef.name} on Ghar.food`,
    html: `
      <div style="font-family:sans-serif;max-width:540px;margin:0 auto;color:#1c0a00;">
        <div style="background:#f97316;padding:24px;border-radius:12px 12px 0 0;">
          <h1 style="color:white;margin:0;font-size:24px;">🏠 Ghar.food</h1>
          <p style="color:#ffe7cc;margin:4px 0 0;">Home-cooked goodness, delivered with love</p>
        </div>
        <div style="background:#fffbeb;padding:28px;border-radius:0 0 12px 12px;border:1px solid #fed7aa;">
          <h2 style="color:#c2410c;">Your order is confirmed! 🎉</h2>
          <p>Hi <strong>${customer.name}</strong>, we've got your order:</p>
          
          <div style="background:white;padding:16px;border-radius:8px;border:1px solid #fed7aa;margin:16px 0;">
            <p style="margin:0 0 8px;"><strong>Chef:</strong> ${chef.name}</p>
            <p style="margin:0 0 8px;"><strong>Meal:</strong> ${menu.name} (${menu.meal_type})</p>
            <p style="margin:0 0 8px;"><strong>Price:</strong> ₹${menu.price}</p>
            <p style="margin:0;"><strong>Order ID:</strong> #${order.id.slice(0, 8).toUpperCase()}</p>
          </div>

          <div style="background:#fef3c7;padding:16px;border-radius:8px;margin:16px 0;">
            <p style="margin:0 0 8px;"><strong>💳 Payment:</strong> Please pay ₹${menu.price} to complete your order.</p>
            <p style="margin:0;"><strong>UPI:</strong> ${chef.payment_phone}</p>
            <p style="margin:0;">(Or scan the QR code on the chef's profile page)</p>
          </div>

          <p>📍 Contact chef: ${chef.phone}</p>
          
          <p style="margin-top:24px;color:#6b7280;font-size:14px;">
            Any issues? Email us at 
            <a href="mailto:admin@ghar.food" style="color:#f97316;">admin@ghar.food</a>
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendChefApprovalEmail({ chef }) {
  const resend = getResend();
  if (!resend) return;

  await resend.emails.send({
    from: FROM,
    to: chef.email,
    subject: `🎉 Welcome to Ghar.food – You're approved!`,
    html: `
      <div style="font-family:sans-serif;max-width:540px;margin:0 auto;color:#1c0a00;">
        <div style="background:#f97316;padding:24px;border-radius:12px 12px 0 0;">
          <h1 style="color:white;margin:0;font-size:24px;">🏠 Ghar.food</h1>
        </div>
        <div style="background:#fffbeb;padding:28px;border-radius:0 0 12px 12px;border:1px solid #fed7aa;">
          <h2 style="color:#c2410c;">Congratulations, ${chef.name}! 🎊</h2>
          <p>Your Ghar.food profile has been approved. You're now live on the map!</p>
          <p>Log in to start posting your daily menus:</p>
          <a href="${APP_URL}/chef/login" 
             style="display:inline-block;background:#f97316;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
            Go to Chef Dashboard →
          </a>
          <p style="margin-top:24px;color:#6b7280;font-size:14px;">
            Lunch menu window: <strong>8:00 AM – 10:00 AM</strong> IST<br>
            Dinner menu window: <strong>12:00 PM – 3:00 PM</strong> IST
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendChefRejectionEmail({ chef, reason }) {
  const resend = getResend();
  if (!resend) return;

  await resend.emails.send({
    from: FROM,
    to: chef.email,
    subject: `Update on your Ghar.food application`,
    html: `
      <div style="font-family:sans-serif;max-width:540px;margin:0 auto;color:#1c0a00;">
        <div style="background:#f97316;padding:24px;border-radius:12px 12px 0 0;">
          <h1 style="color:white;margin:0;font-size:24px;">🏠 Ghar.food</h1>
        </div>
        <div style="background:#fffbeb;padding:28px;border-radius:0 0 12px 12px;border:1px solid #fed7aa;">
          <h2>Hi ${chef.name},</h2>
          <p>We reviewed your Ghar.food registration but are unable to approve it at this time.</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          <p>For questions, please write to <a href="mailto:admin@ghar.food" style="color:#f97316;">admin@ghar.food</a></p>
        </div>
      </div>
    `,
  });
}
