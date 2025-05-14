import {AzureOpenAI} from "openai";
import type { NextApiRequest, NextApiResponse } from 'next'

// export type ConverSationStyle = "FUNNY" | "NEUTRAL" | "SAD" | "ANGRY";

export interface IChatGPTPayload {
  history: Array<{ role: string; content: string }>;
}


const simpleOpenAIRequest = async (payload: IChatGPTPayload) => {
  // create a new configuration object with the base path set to the Azure OpenAI endpoint

  const modelName = "gpt-4o";
  const deployment = "ispai-test-gpt4o";
  const apiVersion = "2024-04-01-preview";

  const openai = new AzureOpenAI({
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiKey: process.env.AZURE_OPEN_AI_KEY,
     deployment, apiVersion
  });

  const completion = await openai.chat.completions.create(
    {
      temperature: 0.7,
      messages: payload.history as never,
      stream: false,
      model: modelName
    }
  );

  return [...payload.history, {role: "assistant", content: completion.choices[0].message.content}]; // return the response from the AI, make sure to handle error cases
};


/**
 * Main entry point for the API.
 **/

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {

  if (req.method !== 'POST') {
    return res.status(405).json({error: 'Method Not Allowed'});
  }

  try {
    const result = await simpleOpenAIRequest(req.body);
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}