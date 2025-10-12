import React, { useState, useRef, useEffect } from 'react';

const RichTextEditor = ({ value, onChange, placeholder = 'Enter description...', required = false }) => {
  const editorRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const handleInput = (e) => {
    const html = e.target.innerHTML;
    // Convert HTML to our custom format for backend storage
    const formattedText = convertHtmlToCustomFormat(html);
    onChange(formattedText);
  };

  const convertHtmlToCustomFormat = (html) => {
    // Convert HTML back to our custom format for storage
    let text = html
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '*$1*')
      .replace(/<b[^>]*>(.*?)<\/b>/gi, '*$1*')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '/$1/')
      .replace(/<i[^>]*>(.*?)<\/i>/gi, '/$1/')
      .replace(/<u[^>]*>(.*?)<\/u>/gi, '_$1_')
      .replace(/<span[^>]*class="[^"]*underline[^"]*"[^>]*>(.*?)<\/span>/gi, '_$1_')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<div[^>]*>(.*?)<\/div>/gi, '$1\n')
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n')
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '*   $1')
      .replace(/<ul[^>]*>|<\/ul>|<ol[^>]*>|<\/ol>/gi, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&amp;/gi, '&');
    
    return text.trim();
  };

  const convertCustomFormatToHtml = (text) => {
    if (!text) return '';
    
    // Convert our custom format to HTML for display
    let html = text
      .replace(/\*\*([^*]+)\*\*/g, '<h3 class="font-bold text-gray-900 text-lg mt-4 mb-2 border-b border-pink-200 pb-2">$1</h3>')
      .replace(/\*([^*]+)\*/g, '<strong class="font-bold text-gray-900">$1</strong>')
      .replace(/_([^_]+)_/g, '<span class="underline">$1</span>')
      .replace(/\/([^/]+)\//g, '<em class="italic">$1</em>')
      .replace(/\n/g, '<br>')
      .replace(/\*   /g, '<li class="flex items-start ml-4 mb-1"><span class="text-pink-500 mr-2 mt-1 font-bold">•</span><span>$1</span></li>');
    
    return html;
  };

  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current.focus();
    handleInput({ target: editorRef.current });
  };

  const insertBulletPoint = () => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const li = document.createElement('div');
      li.innerHTML = '<span class="text-pink-500 mr-2">•</span>';
      li.style.marginLeft = '16px';
      li.style.marginBottom = '4px';
      li.contentEditable = true;
      
      range.deleteContents();
      range.insertNode(li);
      
      // Move cursor after the bullet point
      const newRange = document.createRange();
      newRange.setStartAfter(li);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
    handleInput({ target: editorRef.current });
  };

  const insertNumberedList = () => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const div = document.createElement('div');
      div.innerHTML = '<span class="text-gray-600 mr-2">1.</span>';
      div.style.marginLeft = '16px';
      div.style.marginBottom = '4px';
      div.contentEditable = true;
      
      range.deleteContents();
      range.insertNode(div);
      
      // Move cursor after the number
      const newRange = document.createRange();
      newRange.setStartAfter(div);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
    handleInput({ target: editorRef.current });
  };

  return (
    <div className="w-full">
      {/* Formatting Toolbar */}
      <div className="border border-gray-300 rounded-t-lg bg-gray-50 p-2 flex items-center gap-2">
        {/* Text Formatting Group */}
        <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
          <button
            type="button"
            onClick={() => execCommand('bold')}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Bold"
          >
            <span className="font-bold text-gray-700">B</span>
          </button>
          <button
            type="button"
            onClick={() => execCommand('italic')}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Italic"
          >
            <span className="italic text-gray-700">I</span>
          </button>
          <button
            type="button"
            onClick={() => execCommand('underline')}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Underline"
          >
            <span className="underline text-gray-700">U</span>
          </button>
        </div>

        {/* List Formatting Group */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={insertNumberedList}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Numbered List"
          >
            <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </button>
          <button
            type="button"
            onClick={insertBulletPoint}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Bullet List"
          >
            <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        className={`w-full px-3 py-2 border border-gray-300 rounded-b-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[120px] ${
          isFocused ? 'border-blue-500' : ''
        }`}
        style={{ outline: 'none' }}
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        dangerouslySetInnerHTML={{ __html: convertCustomFormatToHtml(value) }}
        data-placeholder={placeholder}
        suppressContentEditableWarning={true}
      />

      {/* Placeholder */}
      {!value && (
        <div 
          className="absolute top-16 left-3 text-gray-400 pointer-events-none"
          style={{ top: '88px' }}
        >
          {placeholder}
        </div>
      )}

      {/* Help Text */}
      <div className="mt-2 text-xs text-gray-500">
        <p><strong>Tips:</strong></p>
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>Select text and use toolbar buttons to format</li>
          <li>Use <strong>**Text**</strong> for section headers (like "Key Features:")</li>
          <li>Bullet points will appear as pink dots on the frontend</li>
          <li>Line breaks are preserved automatically</li>
        </ul>
      </div>
    </div>
  );
};

export default RichTextEditor;
