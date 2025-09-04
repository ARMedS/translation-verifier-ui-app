# app.py
import os
from flask import Flask, render_template, request, jsonify
from openai import OpenAI
import json
from docx import Document
from io import BytesIO

app = Flask(__name__)

def run_llm_verification_single_prompt(english_text, vietnamese_text, api_key, model):
    client = OpenAI(
        api_key=api_key,
        base_url="https://openrouter.ai/api/v1"
    )
    
    prompt = f"""
You are a translation verifier. Compare the following English source text to its Vietnamese translation.
Identify any major problem areas, such as omissions, very bad semantic errors, or wild tone mismatches. Minor problems are not important.
For each problem area you find, provide the three words in the English text and the three words in the Vietnamese text that come just 
before the problem, and a few words indicating what type of problem it is, and then a paragraph explaining the problem in more detail.
Return a single JSON object with a key "markers" which contains a JSON array of objects. Each object in the array should have 
"english_marker", "vietnamese_marker", "explanation", and "detailed_explanation" keys.
For example:
{{
  "markers": [
    {{ 
      "english_marker": "the quick brown", 
      "vietnamese_marker": "con cáo nhanh", 
      "explanation": "very bad semantic error follows",
      "detailed_explanation": "The English text refers to 'the quick brown fox' but the Vietnamese translation says 'con cáo nhanh' (the quick fox). The word 'brown' (màu nâu) is completely missing from the Vietnamese translation, which changes the meaning significantly as it removes a key descriptive detail about the fox's appearance."
    }},
    {{ 
      "english_marker": "jumps over the", 
      "vietnamese_marker": "nhảy qua con", 
      "explanation": "key fact from english text is missing",
      "detailed_explanation": "The English text says 'jumps over the lazy dog' but the Vietnamese translation only says 'nhảy qua con' (jumps over the). The phrase 'lazy dog' (con chó lười) is completely omitted, which removes an important part of the sentence structure and meaning."
    }}
  ]
}}
If you find no problems, the "markers" array should be empty.

English Text:
---
{english_text}
---

Vietnamese Text:
---
{vietnamese_text}
---
"""
    
    try:
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"} # Request JSON output
        )
        llm_output = response.choices[0].message.content.strip()
        result = json.loads(llm_output)
        return result.get("markers", [])

    except Exception as e:
        print(f"Error processing LLM response: {e}")
        return []


@app.route('/')
def index():
    return render_template('index.html')

@app.route('/verify', methods=['POST'])
def verify():
    try:
        english_file = request.files['english_file']
        vietnamese_file = request.files['vietnamese_file']
        api_key = request.form['api_key']
        model = request.form['model']

        english_text = english_file.read().decode('utf-8')

        vietnamese_filename = vietnamese_file.filename
        if vietnamese_filename.lower().endswith('.docx'):
            doc = Document(BytesIO(vietnamese_file.read()))
            vietnamese_text = "\n\n".join([p.text.strip() for p in doc.paragraphs if p.text.strip()])
        else:
            vietnamese_text = vietnamese_file.read().decode('utf-8')

        markers = run_llm_verification_single_prompt(english_text, vietnamese_text, api_key, model)
        
        return jsonify({
            "english_text": english_text,
            "vietnamese_text": vietnamese_text,
            "markers": markers
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
