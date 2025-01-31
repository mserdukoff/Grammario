import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { sentence } = await req.json()
    console.log("Received sentence:", sentence)

    if (!sentence) {
      return NextResponse.json({ error: "No sentence provided" }, { status: 400 })
    }

    const response = await fetch(process.env.GRAMMARIO_API_URL!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sentence }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("API Error:", errorText)
      return NextResponse.json({ error: `API Error: ${errorText}` }, { status: response.status })
    }

    const data = await response.json()
    console.log("Raw LLM output:", JSON.stringify(data, null, 2))

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error processing sentence:", error)
    return NextResponse.json(
      { error: `Server Error: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 },
    )
  }
}

