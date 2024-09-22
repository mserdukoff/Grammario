import stanza

# Initialize Stanza pipeline for Turkish
nlp = stanza.Pipeline('tr')

# Define the extract_suffixes function
def extract_suffixes(word, feats):
    suffixes = []

    # Vowel harmony helper
    def vowel_harmony(suffix):
        vowels_back = "aıou"
        vowels_front = "eiöü"
        if any(v in word for v in vowels_back):
            return suffix.replace("e", "a").replace("i", "ı").replace("ö", "o").replace("ü", "u")
        return suffix

    if feats:
        # Verb infinitive and case suffixes (handle infinitive before case)
        if 'VerbForm=Vnoun' in feats:
            suffixes.append(vowel_harmony('-mek'))  # Verb infinitive suffix (-mek / -mak)
            if 'Case=Dat' in feats and '-e' not in suffixes:
                suffixes.append(vowel_harmony('-e'))  # Dative case suffix (-e / -a)

        # Possessive suffixes (for nouns)
        if 'Person[psor]=1' in feats and '-im' not in suffixes:
            suffixes.append(vowel_harmony('-im'))  # First person singular possessive
        elif 'Person[psor]=2' in feats and '-in' not in suffixes:
            suffixes.append(vowel_harmony('-in'))  # Second person singular possessive
        elif 'Person[psor]=3' in feats and '-u' not in suffixes:
            suffixes.append(vowel_harmony('-u'))  # Third person singular possessive

        # Case suffixes (for nouns and other verb forms)
        if 'Case=Acc' in feats and '-i' not in suffixes:
            suffixes.append(vowel_harmony('-i'))  # Accusative case
        elif 'Case=Dat' in feats and '-e' not in suffixes:
            suffixes.append(vowel_harmony('-e'))  # Dative case
        elif 'Case=Loc' in feats and '-de' not in suffixes:
            suffixes.append(vowel_harmony('-de'))  # Locative case
        elif 'Case=Abl' in feats and '-den' not in suffixes:
            suffixes.append(vowel_harmony('-den'))  # Ablative case
        elif 'Case=Gen' in feats and '-in' not in suffixes:
            suffixes.append(vowel_harmony('-in'))  # Genitive case

        # Participles with possessive suffixes
        if 'VerbForm=Part' in feats:
            # Handle possessive first
            if 'Person[psor]=1' in feats and '-ım' not in suffixes:
                suffixes.append(vowel_harmony('-ım'))  # First person singular possessive
            elif 'Person[psor]=2' in feats and '-ın' not in suffixes:
                suffixes.append(vowel_harmony('-ın'))  # Second person singular possessive
            elif 'Person[psor]=3' in feats and '-ı' not in suffixes:
                suffixes.append(vowel_harmony('-ı'))  # Third person singular possessive
            # Add tense or participle marker
            if 'Tense=Past' in feats and '-dığı' not in suffixes:
                suffixes.append(vowel_harmony('-dığı'))  # Past participle with possessive (-dığı)
            elif 'Tense=Pres' in feats and '-en' not in suffixes:
                suffixes.append(vowel_harmony('-en'))  # Present participle (-en / -an)

        # Plural suffix
        if 'Number=Plur' in feats and '-ler' not in suffixes:
            suffixes.append(vowel_harmony('-ler'))  # Plural suffix

        # Verb tense and aspect suffixes
        if 'Tense=Pres' in feats and 'Aspect=Prog' in feats and '-yor' not in suffixes:
            suffixes.append(vowel_harmony('-yor'))  # Present continuous (progressive)

            # Check for first person singular after progressive aspect
            if 'Person=1' in feats and 'Number=Sing' in feats and '-um' not in suffixes:
                suffixes.append(vowel_harmony('-um'))  # First person singular

        elif 'Tense=Past' in feats and '-di' not in suffixes:
            suffixes.append(vowel_harmony('-di'))  # Simple past tense

        # Perfective aspect suffix (only for finite verb forms)
        if 'Aspect=Perf' in feats and 'VerbForm=Fin' in feats and '-miş' not in suffixes:
            suffixes.append(vowel_harmony('-miş'))  # Reported past (perfective)

        # Future tense
        if 'Tense=Fut' in feats and '-acak' not in suffixes:
            suffixes.append(vowel_harmony('-acak'))  # Future tense
        elif 'Mood=Opt' in feats and '-eyim' not in suffixes:
            suffixes.append(vowel_harmony('-eyim'))  # Optative mood (first person singular)

        # Verb mood suffixes
        if 'Mood=Imp' in feats:
            if 'Person=2' in feats and 'Number=Plur' in feats and '-in' not in suffixes:
                suffixes.append(vowel_harmony('-in'))  # Imperative plural

        # Conditional mood
        if 'Mood=Cnd' in feats and '-se' not in suffixes:
            suffixes.append(vowel_harmony('-se'))  # Conditional mood

        # Voice suffixes
        if 'Voice=Pass' in feats and '-il' not in suffixes:
            suffixes.append(vowel_harmony('-il'))  # Passive voice
        elif 'Voice=Caus' in feats and '-tir' not in suffixes:
            suffixes.append(vowel_harmony('-tir'))  # Causative voice

        # Politeness (informal second person singular)
        if 'Polite=Infm' in feats and 'Person=2' in feats and '-sin' not in suffixes:
            suffixes.append(vowel_harmony('-sin'))  # Informal polite second person singular

    return suffixes


# Function to analyze a Turkish sentence and extract suffixes
def analyze_and_extract_suffixes(sentence):
    # Perform morphological analysis
    doc = nlp(sentence)

    # Prepare the result
    result = []

    # Process each word in the sentence
    for sentence in doc.sentences:
        for word in sentence.words:
            feats = word.feats
            suffixes = extract_suffixes(word.text, feats)
            result.append({
                'word': word.text,
                'lemma': word.lemma,
                'features': feats,
                'suffixes': suffixes
            })
    
    return result

# Example usage
sentence = "Üniversite yılları sonrasında babası Fred Trump'ın emlak ve inşaat firmasında görev almaya başladı. 1971'de babasının şirketlerinde imtiyaz sahibi olup kontrolü ele aldı. Şirkete 'Trump Organizasyon' adını vererek merkezini Manhattan bölgesine taşıdı. Kısa sürede yaptırdığı otellerle adını duyurdu. 1999 yılında babasını kaybetti. 2000'de yapılan seçimlere Reform Partisi başkan adayı olarak katıldı fakat kısa süre sonra adaylıktan çekildi. 2001 yılında bu partiden ayrıldı. 2004 yılında NBC kanalında “Çırak” (The Apprentice) programını hazırlayarak şov dünyasına adım attı. Bazı söylemleri nedeniyle Nobel Barış Ödülü'ne aday gösterildi fakat kazanamadı. 2016 yılındaki seçim sürecinde İslamofobik söylemleri ve seçim vaatleriyle eleştirildi. Forbes'in 2016 yılındaki dünyanın en zengin 400 kişisi listesinde yer aldı. 2016 yılında 70 yaşında olan Trump, seçimleri kazanmasıyla birlikte ABD tarihinin göreve başlayan en yaşlı başkanı olmuştu. 2020 yılındaki seçimde rakibi Joe Biden seçilen en yaşlı ABD başkanı olmuştur. 20 Ocak 2021 tarihinde görevini selefi Joe Biden'e teslim etmesi gereken ABD'nin 45. Başkanı Donald Trump, ABD'nin tarihi devir teslim törenine katılmayan ilk başkan oldu.[2] Hakkında birden fazla azil süreci başlatılan ilk ve tek ABD başkanıdır."
result = analyze_and_extract_suffixes(sentence)

# Display the results
for word_info in result:
    print(f"Word: {word_info['word']}")
    print(f"  Lemma: {word_info['lemma']}")
    print(f"  Features: {word_info['features']}")
    print(f"  Extracted Suffixes: {word_info['suffixes']}")
