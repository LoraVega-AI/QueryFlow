export default function handler(req, res) {
    res.status(200).json({ 
        message: 'CMS Platform (Next.js + PostgreSQL) API',
        tables: ["content_types","content_entries","media_library","users","workflows","publications","webhooks","api_logs"]
    });
}
