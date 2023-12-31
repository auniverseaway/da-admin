import copyObject from '../storage/object/copy';
import copyHelper from './helpers';

export default async function copyHandler(req, env, daCtx) {
  if (req.method === 'POST') {
    const details = await copyHelper(req, daCtx);
    return copyObject(env, daCtx, details);
  }

  return { body: JSON.stringify([]), status: 200, contentType: 'application/json' };
}
