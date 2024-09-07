import os
from fastapi import FastAPI, Request, Form
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from openai import OpenAI
from dotenv import load_dotenv

# Load the API key from .env file
load_dotenv()

# Initialize the OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI()

templates = Jinja2Templates(directory="templates")

@app.get("/", response_class=HTMLResponse)
async def get_form(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/grammar-check")
async def grammar_check(request: Request, language: str = Form(...), text: str = Form(...)):
    instructions = {
        "Turkish": "Give grammatical descriptions of each word in the following Turkish sentence:",
        "Italian": "Give grammatical descriptions of each word in the following Italian sentence:",
        "German": "Give grammatical descriptions of each word in the following German sentence:",
        "Russian": "Give grammatical descriptions of each word in the following Russian sentence:"
    }

    prompt = f"{instructions[language]} {text}"

    # Query OpenAI for grammar breakdown
    grammar_response = client.chat.completions.create(
        messages=[
            {"role": "user", "content": prompt}
        ],
        model="gpt-3.5-turbo",
    )
    grammar_analysis = grammar_response.choices[0].message.content

    # Query OpenAI for English translation
    translation_prompt = f"Translate the following {language} sentence to English: {text}"
    translation_response = client.chat.completions.create(
        messages=[
            {"role": "user", "content": translation_prompt}
        ],
        model="gpt-3.5-turbo",
    )
    english_translation = translation_response.choices[0].message.content

    return templates.TemplateResponse("index.html", {
        "request": request,
        "original_text": text,
        "grammar_analysis": grammar_analysis,
        "english_translation": english_translation,
        "language": language
    })
