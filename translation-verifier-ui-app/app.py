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
before the problem, and a few words indicating what type of problem it is
Return a single JSON object with a key "markers" which contains a JSON array of objects. Each object in the array should have 
"english_marker" and "vietnamese_marker" keys as well as the breif explaination string.
For example:
{{
  "markers": [
    {{ "english_marker": "the quick brown", "vietnamese_marker": "con cáo nhanh", "explaination": "very bad semantic error follows" }},
    {{ "english_marker": "jumps over the", "vietnamese_marker": "nhảy qua con", "explaination": "key fact from english text is missing"}}
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
