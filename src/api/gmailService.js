const GMAIL_API_BASE = 'https://www.googleapis.com/gmail/v1';

export const gmailService = {
  async sendEmail({ accessToken, to, cc, subject, body, trackingCode }) {
    const email = this.createEmail({ to, cc, subject, body });

    const response = await fetch(`${GMAIL_API_BASE}/users/me/messages/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: email,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send email via Gmail API');
    }

    const data = await response.json();
    return data;
  },

  createEmail({ to, cc, subject, body }) {
    const toLine = Array.isArray(to) ? to.join(', ') : to;
    const ccLine = Array.isArray(cc) ? cc.join(', ') : cc;

    const emailLines = [
      `To: ${toLine}`,
      `Cc: ${ccLine}`,
      `Subject: ${subject}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      body,
    ];

    const email = emailLines.join('\r\n');
    const encodedEmail = btoa(unescape(encodeURIComponent(email)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    return encodedEmail;
  },

  async setupWatch({ accessToken, topicName }) {
    const response = await fetch(`${GMAIL_API_BASE}/users/me/watch`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topicName,
        labelIds: ['INBOX'],
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to setup Gmail watch');
    }

    const data = await response.json();
    return data;
  },

  async stopWatch({ accessToken }) {
    const response = await fetch(`${GMAIL_API_BASE}/users/me/stop`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to stop Gmail watch');
    }

    return true;
  },

  async getHistory({ accessToken, startHistoryId }) {
    const response = await fetch(
      `${GMAIL_API_BASE}/users/me/history?startHistoryId=${startHistoryId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch Gmail history');
    }

    const data = await response.json();
    return data;
  },

  async getMessage({ accessToken, messageId }) {
    const response = await fetch(
      `${GMAIL_API_BASE}/users/me/messages/${messageId}?format=full`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch Gmail message');
    }

    const data = await response.json();
    return this.parseMessage(data);
  },

  parseMessage(message) {
    const headers = message.payload.headers;
    const getHeader = (name) => {
      const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
      return header ? header.value : '';
    };

    const subject = getHeader('Subject');
    const from = getHeader('From');
    const to = getHeader('To');
    const cc = getHeader('Cc');
    const date = getHeader('Date');

    const trackingCodeMatch = subject.match(/\[CSP-\d+\]/);
    const trackingCode = trackingCodeMatch ? trackingCodeMatch[0].slice(1, -1) : null;

    let body = '';
    if (message.payload.body.data) {
      body = atob(message.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
    } else if (message.payload.parts) {
      const textPart = message.payload.parts.find(
        part => part.mimeType === 'text/plain'
      );
      if (textPart && textPart.body.data) {
        body = atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      }
    }

    return {
      messageId: message.id,
      threadId: message.threadId,
      subject,
      from,
      to: to.split(',').map(e => e.trim()),
      cc: cc.split(',').map(e => e.trim()).filter(Boolean),
      body,
      date: new Date(date),
      trackingCode,
    };
  },

  extractEmailAddress(emailString) {
    const match = emailString.match(/<(.+?)>/);
    return match ? match[1] : emailString.trim();
  },

  parseEmailList(emailString) {
    if (!emailString) return [];
    return emailString
      .split(',')
      .map(email => this.extractEmailAddress(email))
      .filter(Boolean);
  },
};
