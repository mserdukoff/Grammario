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

    let responseData: any
    const contentType = response.headers.get("content-type")
    if (contentType && contentType.indexOf("application/json") !== -1) {
      responseData = await response.json()
    } else {
      responseData = await response.text()
    }

    if (!response.ok) {
      console.error("API Error:", responseData)
      return NextResponse.json(
        {
          error: `API Error: ${typeof responseData === "string" ? responseData : JSON.stringify(responseData)}`,
        },
        { status: response.status },
      )
    }

    console.log("Raw LLM output:", JSON.stringify(responseData, null, 2))

    return NextResponse.json(responseData)
  } catch (error) {
    console.error("Error processing sentence:", error)
    return NextResponse.json(
      { error: `Server Error: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 },
    )
  }
}

