export function applyCORS(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token');
  
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return true; // handled
    }
    return false; // continue
}