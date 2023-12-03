import {
  S3Client,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';

import getS3Config from '../utils';

function buildInput({ org, key }) {
  return {
    Bucket: `${org}-content`,
    Prefix: key ? `${key}/` : null,
    Delimiter: '/',
  };
}

function combineCommonContents(resp, daCtx) {
  const { CommonPrefixes, Contents } = resp;

  const combined = [];

  if (CommonPrefixes) {
    CommonPrefixes.forEach((prefix) => {
      const name = prefix.Prefix.slice(0, -1).split('/').pop();
      const splitName = name.split('.');

      // Do not add any extension folders
      if (splitName.length > 1) return;

      const path = `/${daCtx.org}/${prefix.Prefix.slice(0, -1)}`;
      combined.push({ name, path });

    });
  }

  if (Contents) {
    Contents.forEach((content) => {
      if (!content.Key.endsWith('.props')) {
        const name = content.Key.split('/').pop();
        if (!name) return;
        // Do this on the server now because one day (?!) this should be done with content types.
        const splitName = name.split('.');
        // Only show true files not hidden files (.props)
        if (splitName[0]) {
          const ext = splitName.pop();
          combined.push({ path: `/${daCtx.org}/${content.Key}`, name, ext, isFile: true });
        }
      }
    });
  }

  return combined;
}

export default async function getObjects(env, daCtx) {
  const config = getS3Config(env);
  const client = new S3Client(config);

  const input = buildInput(daCtx);
  const command = new ListObjectsV2Command(input);
  try {
    const resp = await client.send(command);
    // console.log(resp);
    const body = combineCommonContents(resp, daCtx);
    return {
      body: JSON.stringify(body),
      status: resp.$metadata.httpStatusCode,
      contentType: resp.ContentType
    };
  } catch (e) {
    return { body: '', status: 404 };
  }
}