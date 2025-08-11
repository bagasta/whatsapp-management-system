export async function buildFullPayload({ client, msg }) {
  // contact & chat info
  const contact = await msg.getContact().catch(() => null);
  const chat = await msg.getChat().catch(() => null);
  const quotedMsg = msg.hasQuotedMsg ? await msg.getQuotedMessage().catch(() => null) : null;

  const basic = {
    event: 'message',
    sessionId: client?.options?.authStrategy?._state?.clientId || 'default',
    timestamp: Date.now(),
    message: {
      id: msg.id?._serialized,
      from: msg.from,
      to: msg.to,
      author: msg.author || null,
      body: msg.body || '',
      type: msg.type,
      deviceType: msg.deviceType,
      timestamp: msg.timestamp,
      hasMedia: msg.hasMedia,
      mentionedIds: msg.mentionedIds || [],
      isForwarded: msg.isForwarded || false,
      forwardingScore: msg.forwardingScore || 0,
      isStatus: msg.isStatus || false,
      isStarred: msg.isStarred || false,
      isFromMe: msg.fromMe || false,
    },
    contact: contact ? {
      id: contact.id?._serialized,
      number: contact.number,
      pushname: contact.pushname,
      name: contact.name,
      isBusiness: contact.isBusiness || false,
      isEnterprise: contact.isEnterprise || false,
      isMyContact: contact.isMyContact || false,
    } : null,
    chat: chat ? {
      id: chat.id?._serialized,
      name: chat.name,
      isGroup: chat.isGroup,
      archived: chat.archived,
      isReadOnly: chat.isReadOnly,
      unreadCount: chat.unreadCount,
    } : null,
    groupMetadata: null,
    quoted: quotedMsg ? {
      id: quotedMsg.id?._serialized,
      from: quotedMsg.from,
      body: quotedMsg.body,
      type: quotedMsg.type,
      hasMedia: quotedMsg.hasMedia,
    } : null,
    media: null
  };

  if (chat && chat.isGroup) {
    try {
      const md = await chat.getMetadata();
      basic.groupMetadata = {
        id: md.id?._serialized,
        subject: md.subject,
        owner: md.owner?._serialized || md.owner || null,
        participantsCount: (md.participants || []).length,
      };
    } catch {}
  }

  if (msg.hasMedia) {
    try {
      const media = await msg.downloadMedia();
      basic.media = {
        mimetype: media.mimetype,
        filename: media.filename || null,
        data: media.data, // base64
        size: Buffer.from(media.data, 'base64').length
      };
    } catch {}
  }

  return basic;
}
