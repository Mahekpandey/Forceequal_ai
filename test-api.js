// Quick test to verify API key and model availability
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';
console.log('Testing API key:', apiKey ? '✓ Key found' : '✗ No key in env');

if (!apiKey) {
  console.error('ERROR: GEMINI_API_KEY not set in .env file');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function testModels() {
  const models = [
    'gemini-3-pro-preview'
  ];

  console.log('\nTesting models...\n');
  
  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Say "OK"');
      console.log(`✓ ${modelName} - WORKING`);
      return; // Found a working model
    } catch (error) {
      console.log(`✗ ${modelName} - ${error.message?.split(':')[0]}`);
    }
  }
}

testModels();
