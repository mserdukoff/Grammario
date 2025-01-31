import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"

const blogPosts = [
  {
    title: "Grammario Update 1/1/25",
    date: "January 1, 2025",
    content:
      "And with the new year, I present version 0.1.0 of Grammario! It's very bare and is not polished whatsoever, but I do want to show the basic functionality to the world. Once that is tried and tested, then I will move to making the website world class!",
  },
  {
    title: "Grammario Project Update 12/29/24",
    date: "December 29, 2024",
    content:
      "Utilizing some stuff I learned in the realm of prompt engineering, we finally have an output that shows promises!",
    code: `{
      "sentence": {
          "Ho": {
              "position": 1,
              "part_of_speech": "verb",
              "root": "avere",
              "noun_components": {
                  "affixes": null
              },
              "noun_case": null,
              "noun_case_components": null,
              "verb_tense": "present perfect",
              "verb_tense_components": [
                  "ho"
              ]
          },
          "visto": {
              "position": 2,
              "part_of_speech": "verb",
              "root": "vedere",
              "noun_components": {
                  "affixes": null
              },
              "noun_case": null,
              "noun_case_components": null,
              "verb_tense": "past participle",
              "verb_tense_components": [
                  "visto"
              ]
          },
          "una": {
              "position": 3,
              "part_of_speech": "article",
              "root": null,
              "noun_components": {
                  "affixes": null
              },
              "noun_case": null,
              "noun_case_components": null,
              "verb_tense": null,
              "verb_tense_components": null
          },
          "bella": {
              "position": 4,
              "part_of_speech": "adjective",
              "root": null,
              "noun_components": {
                  "affixes": null
              },
              "noun_case": null,
              "noun_case_components": null,
              "verb_tense": null,
              "verb_tense_components": null
          },
          "ragazza": {
              "position": 5,
              "part_of_speech": "noun",
              "root": null,
              "noun_components": {
                  "affixes": null
              },
              "noun_case": null,
              "noun_case_components": null,
              "verb_tense": null,
              "verb_tense_components": null
          }
      },
      "relationship_matrix": [
          [0, 0, 0, 0, 0],
          [1, 0, 0, 0, 0],
          [0, 0, 0, 1, 1],
          [0, 0, 0, 0, 1],
          [0, 0, 0, 0, 0]
      ]
    }`,
  },
  {
    title: "Grammario Project Update 12/21/24",
    date: "December 21, 2024",
    content:
      "In recent months other projects have taken priority over this passion project so I have unfortunately been taking a hiatus from this, but yesterday I finally drew up a rough outline of how I want this application to work.",
    images: ["/images/page1.png", "/images/page2.png", "/images/page3.png"],
  },
  {
    title: "Grammario Update 11/1/24",
    date: "November 1, 2024",
    content:
      'After the last update I have been playing around with prompt engineering in order to get the exact responses necessary to create the desired functionality, but as of right now it has proven fruitless. Sure, I could settle for inconsistent results that "kind of" work and get the basic ideas across but this is not what I want. However, this does not mean I am abandoning the idea of this project-far from it. I will continue to develop my machine learning skills and prompt engineering knowledge until I can create the functionality I so desire. Perhaps I shall even expand the project into a full language learning Web Application, instead of being exclusively to break down grammar. Since I have used every major language application that there is, whether it be Duolingo or LingQ etc.. I believe that I could create a structure that caters more to the enthusiast instead of someone who just keeps learning to keep their Duolingo streak going.',
  },
  {
    title: "Grammario Update – September 19, 2024",
    date: "September 19, 2024",
    content:
      "In my recent work with Grammario, I've conducted several tests using the OpenAI API to break down grammar in Italian and Turkish, as well as testing with the Stanza library for Turkish grammar breakdowns with my own suffix-extraction logic.",
    sections: [
      {
        title: "Test 1: OpenAI API - Italian",
        code: `{
  "sentence": [
    {
      "part_of_speech": "verb",
      "root": "avere",
      "verb_tense": "present perfect",
      "verb_tense_components": {
        "auxiliary_verb": "ho",
        "past_participle": "L'"
      },
      "word": "L'ho"
    },
    {
      "part_of_speech": "verb",
      "root": "fare",
      "verb_tense": "past participle",
      "verb_tense_components": {
        "past_participle": "fatta"
      },
      "word": "fatta"
    },
    {
      "part_of_speech": "verb",
      "root": "imparare",
      "verb_tense": "infinitive",
      "word": "imparare"
    },
    {
      "part_of_speech": "noun",
      "root": "italiano",
      "noun_components": {
        "stem": "italian",
        "suffixes": "o"
      },
      "word": "italiano"
    }
  ]
}`,
      },
      {
        title: "Test 2: OpenAI API - Turkish",
        code: `{
  "sentence": [
    {
      "part_of_speech": "numeral",
      "root": "bir",
      "noun_components": {
        "stem": "bir"
      },
      "word": "bir"
    },
    {
      "part_of_speech": "noun",
      "root": "elma",
      "noun_case": "nominative",
      "word": "elma"
    },
    {
      "part_of_speech": "verb",
      "root": "yemek",
      "verb_tense": "present continuous",
      "verb_tense_components": "iyor",
      "word": "yiyorum"
    }
  ]
}`,
      },
      {
        title: "Test 3: Stanza Library with Custom Suffix-Extracting Logic (Turkish)",
        code: `Word: yapilan
Lemma: yap
Features: Aspect=Perf | Mood=Ind | Polarity=Pos | Tense=Pres | VerbForm=Part | Voice=Pass
Extracted Suffixes: ['-an', '-1l']

Word: seçimlere
Lemma: seçim
Features: Case=Dat | Number=Plur | Person=3
Extracted Suffixes: ['-e', '-ler']

Word: Reform
Lemma: reform
Features: Case=Nom | Number=Sing | Person=3
Extracted Suffixes: []

Word: Partisi
Lemma: parti
Features: Case=Nom | Number=Sing | Number[psor]=Sing | Person=3 | Person[psor]=3
Extracted Suffixes: ['-u']

Word: baskan
Lemma: baskan
Features: Case=Nom | Number=Sing | Person=3
Extracted Suffixes: []

Word: aday
Lemma: aday
Features: Case=Nom | Number=Sing | Number[psor]=Sing | Person=3 | Person[psor]=3
Extracted Suffixes: ['-u']

Word: olarak
Lemma: olarak
Features: None
Extracted Suffixes: []

Word: katildi
Lemma: kat
Features: Aspect=Perf | Mood=Ind | Number=Sing | Person=3 | Polarity=Pos | Tense=Past | Voice=Pass
Extracted Suffixes: ['-d1', '-1l']`,
      },
    ],
  },
  {
    title: "Grammario Project Background",
    date: "September 17, 2024",
    content:
      "A core hobby of mine is language learning. Throughout the years I have used many different websites, applications, and tools in order to make learning easier. Language learning has always been a hobby of mine, but over time, I realized that mastering grammar can often be the most challenging aspect. After scouring the web for tools that could simplify this process, I found that many fell short of providing the depth and clarity needed. Leveraging my knowledge of natural language processing (NLP), I decided to introduce a web app that specifically tackles the complexities of grammar learning, aiming to make this daunting task easier for language learners like myself.",
    example: {
      sentence: "L'ho fatta parlare in italiano.",
      breakdown: [
        { word: "L'", description: 'A pronoun meaning "her," used as the direct object.' },
        { word: "ho", description: 'The verb "have," used as an auxiliary in the present tense.' },
        { word: "fatta", description: 'The past participle of "fare" (to make), agreeing with the feminine pronoun.' },
        { word: "parlare", description: 'The infinitive verb meaning "to speak."' },
        { word: "in", description: "A preposition indicating the language." },
        { word: "italiano", description: 'A noun meaning "Italian," referring to the language being spoken.' },
      ],
    },
  },
]

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Grammario Blog</h1>
      {blogPosts.map((post, index) => (
        <Card key={index} className="mb-8">
          <CardHeader>
            <CardTitle>{post.title}</CardTitle>
            <p className="text-sm text-muted-foreground">{post.date}</p>
          </CardHeader>
          <CardContent>
            <p className="mb-4">{post.content}</p>
            {post.code && (
              <pre className="bg-muted p-4 rounded-md overflow-x-auto">
                <code>{post.code}</code>
              </pre>
            )}
            {post.images && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                {post.images.map((image, imgIndex) => (
                  <div key={imgIndex} className="relative w-full h-64">
                    <Image
                      src={image || "/placeholder.svg"}
                      alt={`Grammario Design Drawing ${imgIndex + 1}`}
                      layout="fill"
                      objectFit="contain"
                    />
                  </div>
                ))}
              </div>
            )}
            {post.sections &&
              post.sections.map((section, sectionIndex) => (
                <div key={sectionIndex} className="mt-4">
                  <h3 className="text-xl font-semibold mb-2">{section.title}</h3>
                  {section.code && (
                    <pre className="bg-muted p-4 rounded-md overflow-x-auto">
                      <code>{section.code}</code>
                    </pre>
                  )}
                </div>
              ))}
            {post.example && (
              <div className="mt-4">
                <h3 className="text-xl font-semibold mb-2">Example Sentence</h3>
                <p className="font-bold mb-2">{post.example.sentence}</p>
                <ul className="list-disc pl-5">
                  {post.example.breakdown.map((item, itemIndex) => (
                    <li key={itemIndex}>
                      <strong>{item.word}</strong>: {item.description}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

