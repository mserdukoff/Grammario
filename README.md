# Grammario

This is an attempt to bring my two greatest interests together, Machine Learning and Linguistics (or more specifically, language learning). I want to create a model which, in its final stage, can take a sentence in a foreign language and break it down completely like so:

### Italian:
Quando sei venuto, il mio amico aveva già lasciato.

**Breakdown:**
- Quando: *When*
- sei venuto: *you came* (ENG: you came, LIT: you are(present)+come(passato prossimo))
- il mio amico: *my male friend* (ENG: my male friend, LIT: the my(masc) friend)
- aveva: *had* (ENG: had, LIT: (he/she/it) had(passato imperfetto))
- già: *already*
- lasciato: *left* (past tense passato prossimo, part of trapassato prossimo 'aveva lasciato')

### Turkish:
Sen geldiğinde o çoktan gitmişti.

**Breakdown:**
- Sen: *You*
- geldiğinde: (root.come-relative clause-your-in, LIT: 'in your coming')
- o: *he/she/it*
- gitmişti: (root.go/leave-reported past tense 3rd p-past tense 3rd p, ENG: 'he/she/it had left')

## Process:

### Stages:

1. First, I will try to build a model that can take in a verb like 'gitmiş' and output the infinitive of said verb, 'gitmek' meaning 'to go'. Then it will show the tense of 'gitmiş', which is 'past perfect', and hopefully break it down into 'git-miş-ti'.
2. If this works, I can try to build a webapp that can utilize this so people can train their language skills.
3. Once I finish those steps, I can try to begin to apply the model to nouns.
4. Then to adjectives (this should be really easy).
5. Undecided yet...

### Data:
I have not found any data in the desired format to train the model, so it seems like I will have to make my own data. Will continue to update this.

## UPDATE 9/7/2024
Since there are no datasets available for building a model like this on my own, I decided I am going to use a premade language model for this.