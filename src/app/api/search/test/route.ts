import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { db } from '@/lib/firebase-admin';

export async function GET(req: NextRequest) {
  try {
    // Test Firebase connection
    const testDocRef = db.collection('test').doc('connection');
    const testDoc = await testDocRef.get();
    
    // Create test document if it doesn't exist
    if (!testDoc.exists) {
      await testDocRef.set({
        timestamp: new Date().toISOString(),
        status: 'active',
        message: 'Test connection successful'
      });
    }

    // Test courses collection
    const resourcesRef = db.collection('courses');
    const sampleDoc = await resourcesRef.limit(1).get();
    const sampleData = sampleDoc.docs[0]?.data();
    
    // Test OpenAI connection
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant."
        },
        {
          role: "user",
          content: "Say hello!"
        }
      ],
      max_tokens: 5,
    });

    return NextResponse.json({
      status: 'success',
      firebase: {
        connected: true,
        document: testDoc.exists ? testDoc.data() : await testDocRef.get().then(doc => doc.data()),
        sampleResource: sampleData ? {
          id: sampleDoc.docs[0].id,
          ...sampleData
        } : null
      },
      openai: {
        connected: true,
        response: completion.choices[0].message.content
      }
    });
  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 });
  }
}