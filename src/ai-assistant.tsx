import { useState, useEffect } from "react";
import {
  AlertCircle,
  Check,
  Feather,
  FileText,
  BarChart2,
  Zap,
  BookOpen,
  Code,
} from "lucide-react";

const API_BASE_URL = "https://5kgqgz91-5000.euw.devtunnels.ms";

export default function AIWritingAssistant() {
  const [text, setText] = useState("");
  const [suggestions, setSuggestions] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [grammarErrors, setGrammarErrors] = useState(0);
  const [suggestionsMade, setSuggestionsMade] = useState(0);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Ready");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("editor");
  const [stats, setStats] = useState({
    words_checked: 0,
    grammar_errors_found: 0,
    suggestions_made: 0,
  });

  // Update word count when text changes
  useEffect(() => {
    const words = text.match(/\b\w+\b/g) || [];
    setWordCount(words.length);
  }, [text]);

  // Fetch current stats
  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/stats`);
      const data = await response.json();
      setStats(data);
      setGrammarErrors(data.grammar_errors_found);
      setSuggestionsMade(data.suggestions_made);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  // Start progress simulation
  const startProgress = () => {
    setProgress(0);
    let progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);
    return progressInterval;
  };

  // Check grammar using real API
  const checkGrammar = async () => {
    if (text.length < 5) {
      setSuggestions("Please enter more text for grammar checking.");
      return;
    }

    setIsLoading(true);
    setStatus("Checking grammar...");
    setSuggestions("");

    const progressInterval = startProgress();

    try {
      const response = await fetch(`${API_BASE_URL}/check-grammar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();

      if (response.ok) {
        let formattedSuggestions = "## Grammar Issues Found\n\n";

        if (data.grammar_issues.length === 0) {
          formattedSuggestions += "No grammar issues found. Great job!\n\n";
        } else {
          data.grammar_issues.forEach((issue: any, index: any) => {
            formattedSuggestions += `**${index + 1}. Error:** "${
              issue.error
            }"\n`;
            formattedSuggestions += `   **Context:** "...${issue.context}..."\n`;
            formattedSuggestions += `   **Suggestion:** ${issue.suggestions.join(
              ", "
            )}\n`;
            formattedSuggestions += `   **Rule:** ${issue.rule}\n\n`;
          });
        }

        setSuggestions(formattedSuggestions);
        setGrammarErrors(data.grammar_issues.length);
        setStats(data.stats);
        setStatus("Grammar check completed");
      } else {
        setSuggestions(`Error: ${data.error || "Failed to check grammar"}`);
        setStatus("Grammar check failed");
      }
    } catch (error) {
      console.error("Error checking grammar:", error);
      setSuggestions(
        "Error: Failed to connect to the grammar checking service"
      );
      setStatus("Grammar check failed");
    } finally {
      clearInterval(progressInterval);
      setProgress(100);
      setIsLoading(false);
    }
  };

  // Analyze text using real API
  const analyzeText = async () => {
    if (text.length < 5) {
      setSuggestions("Please enter more text for analysis.");
      return;
    }

    setIsLoading(true);
    setStatus("Analyzing text...");
    setSuggestions("");

    const progressInterval = startProgress();

    try {
      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();

      if (response.ok) {
        const analysis = data.analysis;
        let formattedAnalysis = "## Text Analysis Results\n\n";

        formattedAnalysis += `Character count: ${analysis.char_count}\n`;
        formattedAnalysis += `Word count: ${analysis.word_count}\n`;
        formattedAnalysis += `Sentence count: ${analysis.sentence_count}\n`;
        formattedAnalysis += `Average word length: ${analysis.avg_word_length.toFixed(
          2
        )} characters\n`;
        formattedAnalysis += `Average sentence length: ${analysis.avg_sentence_length.toFixed(
          2
        )} words\n\n`;

        // Add readability issues
        if (data.readability_issues && data.readability_issues.length > 0) {
          formattedAnalysis += "### Readability Issues\n\n";
          data.readability_issues.forEach((issue) => {
            formattedAnalysis += `⚠️ ${issue.message}\n\n`;
          });
        }

        // Add sentiment analysis
        formattedAnalysis += "### Sentiment Analysis\n\n";
        formattedAnalysis += `Overall tone: ${analysis.overall_sentiment}\n`;
        formattedAnalysis += `Positive paragraphs: ${analysis.positive_paragraphs}\n`;
        formattedAnalysis += `Negative paragraphs: ${analysis.negative_paragraphs}\n\n`;

        // Add paragraph sentiment details
        if (
          analysis.sentiment_results &&
          analysis.sentiment_results.length > 0
        ) {
          formattedAnalysis += "### Paragraph Sentiment Details\n\n";
          analysis.sentiment_results.forEach((result, index) => {
            formattedAnalysis += `${index + 1}. "${result.preview}": ${
              result.label
            } (${result.score.toFixed(2)})\n`;
          });
        }

        setSuggestions(formattedAnalysis);
        setStats(data.stats);
        setStatus("Analysis completed");
      } else {
        setSuggestions(`Error: ${data.error || "Failed to analyze text"}`);
        setStatus("Analysis failed");
      }
    } catch (error) {
      console.error("Error analyzing text:", error);
      setSuggestions("Error: Failed to connect to the text analysis service");
      setStatus("Analysis failed");
    } finally {
      clearInterval(progressInterval);
      setProgress(100);
      setIsLoading(false);
    }
  };

  // Suggest improvements using real API
  const suggestImprovements = async () => {
    if (text.length < 10) {
      setSuggestions("Please enter more text for meaningful suggestions.");
      return;
    }

    setIsLoading(true);
    setStatus("Generating suggestions...");
    setSuggestions("");

    const progressInterval = startProgress();

    try {
      const response = await fetch(`${API_BASE_URL}/suggest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();

      if (response.ok) {
        const suggestions = data.suggestions;
        let formattedSuggestions = "## Writing Improvement Suggestions\n\n";

        // Long sentences
        if (
          suggestions.long_sentences &&
          suggestions.long_sentences.length > 0
        ) {
          formattedSuggestions += "### Long Sentences\n";
          formattedSuggestions +=
            "Consider breaking these long sentences into shorter ones:\n\n";
          suggestions.long_sentences.forEach((item, index) => {
            formattedSuggestions += `${index + 1}. "${item.sentence}"\n\n`;
          });
        }

        // Passive voice
        if (suggestions.passive_voice && suggestions.passive_voice.length > 0) {
          formattedSuggestions += "### Passive Voice\n";
          formattedSuggestions +=
            "Consider rewriting these sentences in active voice:\n\n";
          suggestions.passive_voice.forEach((item, index) => {
            formattedSuggestions += `${index + 1}. "${item.sentence}"\n\n`;
          });
        }

        // Repeated words
        if (
          suggestions.repeated_words &&
          suggestions.repeated_words.length > 0
        ) {
          formattedSuggestions += "### Repeated Words\n";
          formattedSuggestions +=
            "Consider revising these sentences with repeated words:\n\n";
          suggestions.repeated_words.forEach((item, index) => {
            formattedSuggestions += `${index + 1}. "${
              item.sentence
            }" (repeated: "${item.repeated_word}")\n\n`;
          });
        }

        // General suggestions
        if (
          suggestions.general_suggestions &&
          suggestions.general_suggestions.length > 0
        ) {
          formattedSuggestions += "### General Improvement Suggestions\n\n";
          suggestions.general_suggestions.forEach((suggestion) => {
            formattedSuggestions += `• ${suggestion}\n\n`;
          });
        }

        setSuggestions(formattedSuggestions);
        setStats(data.stats);
        setStatus("Suggestions generated");
      } else {
        setSuggestions(
          `Error: ${data.error || "Failed to generate suggestions"}`
        );
        setStatus("Suggestion generation failed");
      }
    } catch (error) {
      console.error("Error generating suggestions:", error);
      setSuggestions("Error: Failed to connect to the suggestion service");
      setStatus("Suggestion generation failed");
    } finally {
      clearInterval(progressInterval);
      setProgress(100);
      setIsLoading(false);
    }
  };

  // Complete text using real API
  const completeText = async () => {
    if (text.length < 5) {
      setSuggestions("Please enter some text for the AI to continue from.");
      return;
    }

    setIsLoading(true);
    setStatus("Generating text completion...");
    setSuggestions("");

    const progressInterval = startProgress();

    try {
      const response = await fetch(`${API_BASE_URL}/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          max_length: 100,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const completion = data.completion;
        let mockCompletion = "## Text Completion Suggestion\n\n";
        mockCompletion += `...${completion.prompt}${completion.generated_text}\n\n`;

        setSuggestions(mockCompletion);
        setStats(data.stats);
        setStatus("Text completion generated");
      } else {
        setSuggestions(
          `Error: ${data.error || "Failed to generate text completion"}`
        );
        setStatus("Text completion failed");
      }
    } catch (error) {
      console.error("Error generating text completion:", error);
      setSuggestions("Error: Failed to connect to the text completion service");
      setStatus("Text completion failed");
    } finally {
      clearInterval(progressInterval);
      setProgress(100);
      setIsLoading(false);
    }
  };

  // Apply the text completion to the editor
  const applyCompletion = () => {
    if (suggestions.includes("Text Completion Suggestion")) {
      // Extract the generated text from suggestions
      const match = suggestions.match(/\.\.\.(.+?)\n\n/s);
      if (match && match[1]) {
        const completionText = match[1];
        // Find the last part that matches the prompt and use what follows
        const promptPart = completionText.substring(
          0,
          Math.min(100, completionText.length)
        );
        const textIndex = text.lastIndexOf(promptPart);

        if (textIndex !== -1) {
          // Apply only the new text (avoid duplicating the prompt)
          setText(text + completionText.substring(promptPart.length));
        } else {
          // Fallback: just append the generated text
          setText(text + " " + completionText);
        }
        setStatus("Text completion applied");
      }
    }
  };

  // Handle creating a new document
  const handleNewDocument = () => {
    if (
      text &&
      !window.confirm("Create new document? Current content will be lost.")
    ) {
      return;
    }
    setText("");
    setSuggestions("");
    setStatus("New document created");

    // Reset stats with API call
    fetch(`${API_BASE_URL}/reset`, {
      method: "POST",
    })
      .then((response) => response.json())
      .then((data) => {
        setStats(data.stats);
        setGrammarErrors(0);
        setSuggestionsMade(0);
      })
      .catch((error) => {
        console.error("Error resetting stats:", error);
      });
  };

  // Initial stats load when component mounts
  useEffect(() => {
    fetchStats();
  }, []);

  const renderEditor = () => (
    <div className="flex flex-col h-full">
      <textarea
        className="w-full h-full p-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Start writing or paste your text here..."
        disabled={isLoading}
      ></textarea>
    </div>
  );

  const renderSuggestions = () => (
    <div className="flex flex-col h-full">
      <div className="w-full h-full p-4 bg-gray-50 border border-gray-300 rounded-md overflow-auto">
        {suggestions ? (
          <div
            className="markdown prose"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(suggestions) }}
          ></div>
        ) : (
          <div className="text-gray-500">
            Suggestions will appear here after analysis
          </div>
        )}
      </div>

      {suggestions.includes("Text Completion Suggestion") && (
        <button
          className="mt-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          onClick={applyCompletion}
        >
          Apply Suggestion
        </button>
      )}
    </div>
  );

  // Simple markdown renderer
  const renderMarkdown = (md: any) => {
    return md
      .replace(/## (.*)/g, '<h2 class="text-xl font-bold mt-4 mb-2">$1</h2>')
      .replace(/### (.*)/g, '<h3 class="text-lg font-bold mt-3 mb-1">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/• (.*)/g, "<li>$1</li>")
      .replace(/\n\n/g, "<br><br>");
  };

  return (
    <div className="flex flex-col w-full max-w-6xl mx-auto p-4 h-[90vh] bg-white text-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
        <div className="flex items-center">
          <Feather className="mr-2 text-blue-600" size={24} />
          <h1 className="text-2xl font-bold">AI Writing Assistant</h1>
        </div>

        <div className="flex space-x-2">
          <button
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 focus:outline-none"
            onClick={handleNewDocument}
          >
            New
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 h-0 space-x-4">
        {/* Left side - Editor */}
        <div className="w-1/2 flex flex-col">
          <div className="flex mb-2">
            <button
              className={`px-3 py-1 rounded-t-md ${
                activeTab === "editor"
                  ? "bg-white border-t border-l border-r border-gray-300"
                  : "bg-gray-100"
              }`}
              onClick={() => setActiveTab("editor")}
            >
              <FileText className="inline mr-1" size={16} /> Editor
            </button>
            <button
              className={`px-3 py-1 rounded-t-md ${
                activeTab === "code"
                  ? "bg-white border-t border-l border-r border-gray-300"
                  : "bg-gray-100"
              }`}
              onClick={() => setActiveTab("code")}
            >
              <Code className="inline mr-1" size={16} /> Code View
            </button>
          </div>
          <div className="flex-1 border border-gray-300 rounded-md overflow-hidden">
            {activeTab === "editor" ? (
              renderEditor()
            ) : (
              <div className="w-full h-full p-4 bg-gray-900 text-gray-200 font-mono overflow-auto">
                <pre>{`// API Integration with Flask Backend
async function checkGrammar(text) {
  const response = await fetch('${API_BASE_URL}/check-grammar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  return await response.json();
}

// Sample text to process
const text = """${text || "Enter your text in the editor tab"}""";

// Call the API and process results
checkGrammar(text).then(results => {
  console.log(\`Found \${results.grammar_issues.length} grammar issues\`);
});`}</pre>
              </div>
            )}
          </div>
        </div>

        {/* Right side - Suggestions panel */}
        <div className="w-1/2 flex flex-col">
          <div className="flex mb-2">
            <button className="px-3 py-1 rounded-t-md bg-white border-t border-l border-r border-gray-300">
              <AlertCircle className="inline mr-1" size={16} /> AI Suggestions
            </button>
          </div>
          <div className="flex-1 border border-gray-300 rounded-md overflow-hidden">
            {renderSuggestions()}
          </div>

          {/* Statistics */}
          <div className="mt-4 p-3 bg-gray-50 border border-gray-300 rounded-md">
            <h3 className="text-sm font-bold mb-2">Statistics</h3>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="flex items-center">
                <FileText className="mr-1 text-blue-600" size={14} />
                <span>Words: {stats.words_checked}</span>
              </div>
              <div className="flex items-center">
                <AlertCircle className="mr-1 text-red-600" size={14} />
                <span>Grammar errors: {stats.grammar_errors_found}</span>
              </div>
              <div className="flex items-center">
                <Check className="mr-1 text-green-600" size={14} />
                <span>Suggestions: {stats.suggestions_made}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom toolbar */}
      <div className="mt-4 flex flex-col">
        {/* Progress bar */}
        {isLoading && (
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-between items-center">
          <div className="flex space-x-2">
            <button
              className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300 flex items-center"
              onClick={checkGrammar}
              disabled={isLoading || text.length < 5}
            >
              <AlertCircle className="mr-1" size={16} />
              Check Grammar
            </button>
            <button
              className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-green-300 flex items-center"
              onClick={analyzeText}
              disabled={isLoading || text.length < 5}
            >
              <BarChart2 className="mr-1" size={16} />
              Analyze Text
            </button>
            <button
              className="px-3 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:bg-yellow-300 flex items-center"
              onClick={suggestImprovements}
              disabled={isLoading || text.length < 10}
            >
              <BookOpen className="mr-1" size={16} />
              Suggest Improvements
            </button>
            <button
              className="px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-purple-300 flex items-center"
              onClick={completeText}
              disabled={isLoading || text.length < 5}
            >
              <Zap className="mr-1" size={16} />
              Complete Text
            </button>
          </div>

          <div className="text-sm text-gray-600">Status: {status}</div>
        </div>
      </div>
    </div>
  );
}
