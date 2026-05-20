<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #F5EDE3;
      padding: 40px 20px;
      color: #2C1A0E;
    }
    .container {
      max-width: 520px;
      margin: 0 auto;
      background: #FDFCF9;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(107,58,31,0.12);
    }
    .header {
      background: linear-gradient(135deg, #6B3A1F, #8B5A2B);
      padding: 36px 40px;
      text-align: center;
    }
    .brand {
      font-size: 28px;
      font-weight: 700;
      color: white;
      letter-spacing: -0.5px;
    }
    .brand span { color: #F4C07A; }
    .header p {
      color: rgba(255,255,255,0.6);
      font-size: 13px;
      margin-top: 4px;
      letter-spacing: 1.5px;
    }
    .body {
      padding: 36px 40px;
    }
    .greeting {
      font-size: 20px;
      font-weight: 700;
      color: #6B3A1F;
      margin-bottom: 12px;
    }
    .message {
      font-size: 14px;
      color: #5C3D1E;
      line-height: 1.7;
      margin-bottom: 28px;
    }
    .btn {
      display: block;
      text-align: center;
      background: linear-gradient(135deg, #6B3A1F, #8B5A2B);
      color: white !important;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 700;
      margin-bottom: 24px;
      letter-spacing: 0.3px;
    }
    .divider {
      height: 1px;
      background: #E8D5BC;
      margin: 24px 0;
    }
    .url-box {
      background: #F5EDE3;
      border: 1px solid #D4B896;
      border-radius: 8px;
      padding: 12px 14px;
      font-size: 11px;
      color: #8B6040;
      word-break: break-all;
      line-height: 1.6;
    }
    .footer {
      padding: 20px 40px 28px;
      text-align: center;
      font-size: 12px;
      color: #9B7355;
      border-top: 1px solid #E8D5BC;
    }
    .expire-note {
      background: #FEF3C7;
      border: 1px solid #FDE68A;
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 12px;
      color: #92400E;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <div class="container">

    <!-- Header -->
    <div class="header">
      <div class="brand">Smart<span>Planner</span></div>
      <p>ADAPTIVE AI STUDY PLANNER</p>
    </div>

    <!-- Body -->
    <div class="body">
      <div class="greeting">Hello, {{ $userName }}! 👋</div>
      <p class="message">
        We received a request to reset your SmartPlanner password.
        Click the button below to create a new password.
        If you didn't make this request, you can safely ignore this email.
      </p>

      <a href="{{ $resetUrl }}" class="btn">
        🔐 Reset My Password
      </a>

      <div class="expire-note">
        ⏱ This link expires in <strong>60 minutes</strong>.
        After that, you'll need to request a new one.
      </div>

      <div class="divider"></div>

      <p style="font-size:12px; color:#8B6040; margin-bottom:10px;">
        If the button above doesn't work, copy and paste this link into your browser:
      </p>
      <div class="url-box">{{ $resetUrl }}</div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>© SmartPlanner · FYP · B032410882</p>
      <p style="margin-top:6px; color:#C4A882;">
        This email was sent because a password reset was requested for your account.
      </p>
    </div>

  </div>
</body>
</html>