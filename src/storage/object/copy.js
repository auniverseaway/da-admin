import {
  S3Client,
  ListObjectsV2Command,
  CopyObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import getS3Config from '../utils/config';

function buildInput(org, key) {
  return {
    Bucket: `${org}-content`,
    Prefix: `${key}/`,
  };
}

const copyFile = async (client, org, sourceKey, details) => {
  const Key = `${sourceKey.replace(details.source, details.destination)}`;

  try {
    const resp = await client.send(
      new CopyObjectCommand({
        Bucket: `${org}-content`,
        Key,
        CopySource: `${org}-content/${sourceKey}`,
      }),
    );
  } catch (e) {
    console.log(e.$metadata);
  }

  // const delCommand = new DeleteObjectCommand({ Bucket: `${org}-content`, Key: sourceKey });
  // const url = await getSignedUrl(client, delCommand, { expiresIn: 3600 });
  // await fetch(url, { method: 'DELETE' });
};

export default async function copyObject(env, daCtx, details) {
  const config = getS3Config(env);
  const client = new S3Client(config);
  const input = buildInput(daCtx.org, details.source);

  let ContinuationToken;

  // The input prefix has a forward slash to prevent (drafts + drafts-new, etc.).
  // Which means the list will only pickup children. This adds to the initial list.
  const sourceKeys = [details.source, `${details.source}.props`];

  do {
    try {
      const command = new ListObjectsV2Command({ ...input, ContinuationToken });
      const resp = await client.send(command);

      const { Contents = [], NextContinuationToken } = resp;
      sourceKeys.push(...Contents.map(({ Key }) => Key));

      await Promise.all(
        new Array(1).fill(null).map(async () => {
          while (sourceKeys.length) {
            await copyFile(client, daCtx.org, sourceKeys.pop(), details);
          }
        }),
      );

      ContinuationToken = NextContinuationToken;
    } catch (e) {
      return { body: '', status: 404 };
    }
  } while (ContinuationToken);

  return { body: '', status: 204 };
}
