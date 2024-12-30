import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { sentence } = await req.json()
    console.log('Received sentence:', sentence)

    if (!sentence) {
      return NextResponse.json({ error: 'No sentence provided' }, { status: 400 })
    }

    const response = await fetch('http://127.0.0.1:8000/grammar/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sentence }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    console.log('Raw LLM output:', JSON.stringify(data, null, 2))

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error processing sentence:', error)
    return NextResponse.json({ error: 'Failed to process sentence' }, { status: 500 })
  }
}

