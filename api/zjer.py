from flask import Flask, request, jsonify
from flask_cors import CORS
import nltk
from nltk.tokenize import sent_tokenize
import language_tool_python
import re
import threading
import time
from transformers import pipeline
import os
import subprocess

nltk.data.path.append(os.path.join(os.path.dirname(__file__), "nltk_data"))

try:
    nltk.data.find('tokenizers/punkt')
    nltk.data.find('tokenizers/punkt_tab')
except LookupError:
    nltk.download('punkt')
    nltk.download('punkt_tab')

app = Flask(__name__)
CORS(app)  

def check_java_version():
    try:
        result = subprocess.run(['java', '-version'], stderr=subprocess.PIPE, text=True)
        version_line = result.stderr.split('\n')[0]
        version = version_line.split()[2].strip('"')
        major_version = int(version.split('.')[0])
        if major_version < 17:
            print(f"Warning: Java {major_version} detected. LanguageTool works best with Java 17+")
    except Exception as e:
        print(f"Java version check failed: {e}")

check_java_version()

grammar_tool = None

sentiment_analyzer = None
text_generator = None

stats = {
    "words_checked": 0,
    "grammar_errors_found": 0,
    "suggestions_made": 0
}

analysis_results = {}

def get_grammar_tool():
    global grammar_tool
    if grammar_tool is None:
        try:
            print("Initializing local LanguageTool...")
            grammar_tool = language_tool_python.LanguageTool('en-US')
        except Exception as e:
            print(f"Local LanguageTool failed, falling back to Web API: {str(e)}")
            grammar_tool = language_tool_python.LanguageToolPublicAPI('en-US')
    return grammar_tool

def get_sentiment_analyzer():
    global sentiment_analyzer
    if sentiment_analyzer is None:
        print("Initializing sentiment analyzer...")
        sentiment_analyzer = pipeline(
            "sentiment-analysis", 
            model="distilbert-base-uncased-finetuned-sst-2-english",
            device=-1 
        )
    return sentiment_analyzer

def get_text_generator():
    global text_generator
    if text_generator is None:
        print("Initializing text generator...")
        text_generator = pipeline(
            "text-generation", 
            model="gpt2",
            device=-1 
        )
    return text_generator

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy", 
        "version": "1.0.0",
        "components": {
            "grammar_check": "active",
            "sentiment_analysis": "active",
            "text_generation": "active"
        }
    })

@app.route('/stats', methods=['GET'])
def get_stats():
    return jsonify(stats)

@app.route('/reset', methods=['POST'])
def reset_stats():
    global stats, analysis_results
    stats = {
        "words_checked": 0,
        "grammar_errors_found": 0,
        "suggestions_made": 0
    }
    analysis_results = {}
    return jsonify({"message": "Stats reset successfully", "stats": stats})

@app.route('/check-grammar', methods=['POST'])
def check_grammar():
    data = request.json
    if not data or 'text' not in data:
        return jsonify({"error": "No text provided"}), 400
    
    text = data['text']
    
    try:
        words = len(re.findall(r'\b\w+\b', text))
        stats["words_checked"] += words
        
        matches = get_grammar_tool().check(text)
        
        results = []
        for match in matches:
            error_context = text[max(0, match.offset-20):match.offset+match.errorLength+20]
            error_text = text[match.offset:match.offset+match.errorLength]
            
            results.append({
                "error": error_text,
                "context": error_context,
                "suggestions": match.replacements[:3] if match.replacements else ["No suggestions"],
                "rule": match.ruleIssueType,
                "offset": match.offset,
                "length": match.errorLength
            })
        
        stats["grammar_errors_found"] += len(results)
        
        return jsonify({
            "grammar_issues": results,
            "total_issues": len(results),
            "stats": stats
        })
        
    except Exception as e:
        print(f"Error in grammar check: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/analyze', methods=['POST'])
def analyze_text():
    """Analyze the text for various metrics"""
    global analysis_results
    
    data = request.json
    if not data or 'text' not in data:
        return jsonify({"error": "No text provided"}), 400
    
    text = data['text']
    
    try:
        char_count = len(text)
        word_count = len(re.findall(r'\b\w+\b', text))
        sentence_count = len(sent_tokenize(text)) if text.strip() else 0
        
        stats["words_checked"] += word_count
        
        words = re.findall(r'\b\w+\b', text)
        avg_word_length = sum(len(word) for word in words) / max(1, len(words))
        
        sentences = sent_tokenize(text) if text.strip() else []
        avg_sentence_length = sum(len(re.findall(r'\b\w+\b', sentence)) for sentence in sentences) / max(1, len(sentences))
        
        paragraphs = text.split('\n\n')
        sentiment_results = []
        
        valid_paragraphs = [p for p in paragraphs if p.strip() and len(p.strip()) > 3]
        
        for i, para in enumerate(valid_paragraphs):
            try:
                para_to_analyze = para[:512]
                sentiment = get_sentiment_analyzer()(para_to_analyze)[0]
                sentiment_results.append({
                    "preview": para[:50] + "..." if len(para) > 50 else para,
                    "full_paragraph": para,
                    "label": sentiment['label'],
                    "score": sentiment['score']
                })
            except Exception as e:
                print(f"Error analyzing sentiment for paragraph {i}: {e}")
                sentiment_results.append({
                    "preview": para[:50] + "..." if len(para) > 50 else para,
                    "full_paragraph": para,
                    "label": "NEUTRAL",
                    "score": 0.5
                })
        
        readability_issues = []
        if avg_sentence_length > 25:
            readability_issues.append({
                "issue": "long_sentences",
                "message": "Sentences are quite long on average. Consider breaking some into shorter ones for better readability."
            })
        elif avg_sentence_length < 10 and sentence_count > 3:
            readability_issues.append({
                "issue": "short_sentences",
                "message": "Sentences are quite short on average. Consider combining some related ideas for better flow."
            })
        
        positive_count = sum(1 for item in sentiment_results if item["label"] == "POSITIVE")
        negative_count = sum(1 for item in sentiment_results if item["label"] == "NEGATIVE")
        
        if positive_count > negative_count:
            overall_sentiment = "Mostly Positive"
        elif negative_count > positive_count:
            overall_sentiment = "Mostly Negative"
        else:
            overall_sentiment = "Neutral"
        
        analysis = {
            "char_count": char_count,
            "word_count": word_count,
            "sentence_count": sentence_count,
            "avg_word_length": avg_word_length,
            "avg_sentence_length": avg_sentence_length,
            "overall_sentiment": overall_sentiment,
            "positive_paragraphs": positive_count,
            "negative_paragraphs": negative_count,
            "sentiment_results": sentiment_results
        }
        
        analysis_results[text[:100]] = analysis 
        
        return jsonify({
            "analysis": analysis,
            "readability_issues": readability_issues,
            "stats": stats
        })
        
    except Exception as e:
        print(f"Error in text analysis: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/suggest', methods=['POST'])
def suggest_improvements():
    data = request.json
    if not data or 'text' not in data:
        return jsonify({"error": "No text provided"}), 400
    
    text = data['text']
    
    try:
        words = len(re.findall(r'\b\w+\b', text))
        stats["words_checked"] += words
        
        sentences = sent_tokenize(text)
        long_sentences = []
        
        for sentence in sentences:
            word_count = len(re.findall(r'\b\w+\b', sentence))
            if word_count > 25: 
                long_sentences.append({
                    "sentence": sentence,
                    "word_count": word_count
                })
        
        passive_regex = r'\b(?:am|is|are|was|were|be|been|being)\s+(\w+ed|written|done|made|said|known|gone|taken)\b'
        passive_matches = re.finditer(passive_regex, text, re.IGNORECASE)
        
        passive_voice = []
        for match in passive_matches:
            for sentence in sentences:
                if match.group(0) in sentence:
                    passive_voice.append({
                        "sentence": sentence,
                        "match": match.group(0)
                    })
                    break
        
        repeated_word_regex = r'\b(\w+)\s+\1\b'
        repeated_matches = re.finditer(repeated_word_regex, text, re.IGNORECASE)
        
        repeated_words = []
        for match in repeated_matches:
            for sentence in sentences:
                if match.group(0) in sentence:
                    repeated_words.append({
                        "sentence": sentence,
                        "repeated_word": match.group(1)
                    })
                    break
        
        general_suggestions = []
        
        if len(long_sentences) > 2:
            general_suggestions.append("Consider breaking long sentences into shorter ones for clarity.")
        
        if len(passive_voice) > 2:
            general_suggestions.append("Try using more active voice to make your writing more engaging and direct.")
        
        if words < 100:
            general_suggestions.append("Your text is quite short. Consider expanding your ideas for more depth.")
        elif words > 1000:
            general_suggestions.append("Your text is quite long. Consider organizing it into clear sections.")
        
        suggestion_count = len(long_sentences) + len(passive_voice) + len(repeated_words) + len(general_suggestions)
        stats["suggestions_made"] += suggestion_count
        
        suggestions = {
            "long_sentences": long_sentences,
            "passive_voice": passive_voice,
            "repeated_words": repeated_words,
            "general_suggestions": general_suggestions
        }
        
        return jsonify({
            "suggestions": suggestions,
            "suggestion_count": suggestion_count,
            "stats": stats
        })
        
    except Exception as e:
        print(f"Error in suggesting improvements: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/complete', methods=['POST'])
def complete_text():
    data = request.json
    if not data or 'text' not in data:
        return jsonify({"error": "No text provided"}), 400
    
    text = data['text']
    max_length = data.get('max_length', 50) 
    
    try:
        last_chars = text[-100:] if len(text) > 100 else text
        
        generator = get_text_generator()
        generated = generator(
            last_chars, 
            max_new_tokens=max_length,
            num_return_sequences=1,
            temperature=0.7,
            top_p=0.9,
            do_sample=True
        )
        
        full_text = generated[0]['generated_text']
        new_text = full_text[len(last_chars):]
        
        stats["suggestions_made"] += 1
        
        return jsonify({
            "completion": {
                "prompt": last_chars,
                "generated_text": new_text,
                "full_text": full_text
            },
            "stats": stats
        })
        
    except Exception as e:
        print(f"Error in text completion: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)