#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const { marked } = require('marked');
const matter = require('gray-matter');

class DocsGenerator {
  constructor() {
    this.docsDir = './docs';
    this.excludeFiles = ['temp.md', 'draft.md']; // 제외할 파일들
    this.outputFile = './index.html';
  }

  // 마크다운 파일들을 스캔하고 메타데이터 추출
  scanMarkdownFiles() {
    const files = [];
    
    // README.md 포함
    if (fs.existsSync('./README.md')) {
      const content = fs.readFileSync('./README.md', 'utf-8');
      const { data, content: markdownContent } = matter(content);
      files.push({
        path: 'README.md',
        title: data.title || 'README',
        category: data.category || 'Root',
        date: data.date || new Date().toISOString(),
        content: markdownContent
      });
    }

    // docs 디렉터리 스캔
    if (fs.existsSync(this.docsDir)) {
      const docFiles = fs.readdirSync(this.docsDir)
        .filter(file => file.endsWith('.md'))
        .filter(file => !this.excludeFiles.includes(file));

      docFiles.forEach(file => {
        const filePath = path.join(this.docsDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const { data, content: markdownContent } = matter(content);
        
        files.push({
          path: filePath,
          title: data.title || file.replace('.md', ''),
          category: data.category || 'Documentation',
          date: data.date || fs.statSync(filePath).mtime.toISOString(),
          content: markdownContent
        });
      });
    }

    return files.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  // HTML 생성
  generateHTML(files) {
    const categories = {};
    
    // 카테고리별로 그룹화
    files.forEach(file => {
      if (!categories[file.category]) {
        categories[file.category] = [];
      }
      categories[file.category].push(file);
    });

    // 사이드바 네비게이션 생성
    let sidebarHTML = '';
    Object.entries(categories).forEach(([category, categoryFiles]) => {
      sidebarHTML += `
        <div class="sidebar-category">
          <div class="sidebar-category-title" onclick="toggleCategory('${category.replace(/\s+/g, '-')}', this)">${category}</div>
          <div class="sidebar-files" id="category-${category.replace(/\s+/g, '-')}">
            ${categoryFiles.map((file, index) => `
              <div class="sidebar-file" onclick="showFile('${category.replace(/\s+/g, '-')}-${index}', this)">
                ${file.title}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    });

    // 메인 콘텐츠 생성
    let mainContentHTML = '';
    let isFirst = true;
    Object.entries(categories).forEach(([category, categoryFiles]) => {
      categoryFiles.forEach((file, index) => {
        const fileId = `${category.replace(/\s+/g, '-')}-${index}`;
        mainContentHTML += `
          <div class="file-content-wrapper ${isFirst ? 'active' : ''}" id="content-${fileId}">
            <div class="file-header">
              <h1 class="file-title">${file.title}</h1>
              <div class="file-meta">
                <span class="file-category">${category}</span>
                <span class="file-date">${new Date(file.date).toLocaleDateString()}</span>
                <span class="file-path">${file.path}</span>
              </div>
            </div>
            <div class="file-content">
              ${marked(file.content)}
            </div>
          </div>
        `;
        isFirst = false;
      });
    });

    return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>프로젝트 문서</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8f9fa;
            overflow-x: hidden;
        }
        
        .container {
            display: flex;
            height: 100vh;
        }
        
        /* 사이드바 스타일 */
        .sidebar {
            width: 300px;
            background: #2c3e50;
            color: white;
            overflow-y: auto;
            border-right: 1px solid #34495e;
            flex-shrink: 0;
        }
        
        .sidebar-header {
            padding: 20px;
            background: #34495e;
            border-bottom: 1px solid #4a5f7a;
        }
        
        .sidebar-header h1 {
            font-size: 1.5em;
            margin-bottom: 5px;
        }
        
        .sidebar-header .subtitle {
            font-size: 0.9em;
            color: #bdc3c7;
        }
        
        .sidebar-category {
            border-bottom: 1px solid #34495e;
        }
        
        .sidebar-category-title {
            padding: 15px 20px;
            background: #2c3e50;
            font-weight: 600;
            cursor: pointer;
            transition: background-color 0.2s;
            position: relative;
        }
        
        .sidebar-category-title:hover {
            background: #34495e;
        }
        
        .sidebar-category-title:after {
            content: '▼';
            position: absolute;
            right: 20px;
            transition: transform 0.2s;
        }
        
        .sidebar-category-title.collapsed:after {
            transform: rotate(-90deg);
        }
        
        .sidebar-files {
            background: #34495e;
            max-height: 500px;
            overflow: hidden;
            transition: max-height 0.3s ease;
        }
        
        .sidebar-files.collapsed {
            max-height: 0;
        }
        
        .sidebar-file {
            padding: 12px 20px 12px 40px;
            cursor: pointer;
            transition: background-color 0.2s;
            border-left: 3px solid transparent;
            font-size: 0.9em;
        }
        
        .sidebar-file:hover {
            background: #4a5f7a;
        }
        
        .sidebar-file.active {
            background: #3498db;
            border-left-color: #2980b9;
            font-weight: 500;
        }
        
        /* 메인 콘텐츠 스타일 */
        .main-content {
            flex: 1;
            overflow-y: auto;
            background: white;
        }
        
        .file-content-wrapper {
            display: none;
            padding: 40px 60px;
            max-width: 900px;
            margin: 0 auto;
        }
        
        .file-content-wrapper.active {
            display: block;
        }
        
        .file-header {
            border-bottom: 1px solid #ecf0f1;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        
        .file-title {
            color: #2c3e50;
            font-size: 2.5em;
            margin-bottom: 15px;
            font-weight: 300;
        }
        
        .file-meta {
            display: flex;
            gap: 15px;
            align-items: center;
            font-size: 0.9em;
            color: #7f8c8d;
        }
        
        .file-category {
            background: #3498db;
            color: white;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.8em;
            font-weight: 500;
        }
        
        .file-date {
            background: #e8f4f8;
            padding: 4px 8px;
            border-radius: 4px;
        }
        
        .file-path {
            font-family: 'SF Mono', Monaco, monospace;
            background: #f8f9fa;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8em;
        }
        
        .file-content {
            line-height: 1.8;
            font-size: 1.1em;
        }
        
        .file-content h1 {
            color: #2c3e50;
            margin: 40px 0 20px 0;
            font-size: 2em;
            font-weight: 400;
            border-bottom: 2px solid #ecf0f1;
            padding-bottom: 10px;
        }
        
        .file-content h2 {
            color: #2c3e50;
            margin: 35px 0 15px 0;
            font-size: 1.5em;
            font-weight: 500;
        }
        
        .file-content h3 {
            color: #2c3e50;
            margin: 25px 0 10px 0;
            font-size: 1.25em;
            font-weight: 500;
        }
        
        .file-content p {
            margin-bottom: 20px;
            color: #2c3e50;
        }
        
        .file-content pre {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            overflow-x: auto;
            border-left: 4px solid #3498db;
            margin: 20px 0;
        }
        
        .file-content code {
            background: #f8f9fa;
            padding: 3px 6px;
            border-radius: 3px;
            font-family: 'SF Mono', Monaco, monospace;
            font-size: 0.9em;
            color: #e74c3c;
        }
        
        .file-content pre code {
            background: none;
            padding: 0;
            color: #2c3e50;
        }
        
        .file-content blockquote {
            border-left: 4px solid #3498db;
            padding-left: 20px;
            margin: 25px 0;
            color: #7f8c8d;
            font-style: italic;
        }
        
        .file-content ul, .file-content ol {
            margin: 15px 0 15px 30px;
        }
        
        .file-content li {
            margin-bottom: 8px;
        }
        
        .file-content table {
            width: 100%;
            border-collapse: collapse;
            margin: 25px 0;
        }
        
        .file-content th, .file-content td {
            border: 1px solid #ecf0f1;
            padding: 12px;
            text-align: left;
        }
        
        .file-content th {
            background: #f8f9fa;
            font-weight: 600;
            color: #2c3e50;
        }
        
        .empty-state {
            text-align: center;
            padding: 100px 40px;
            color: #7f8c8d;
        }
        
        .empty-state h2 {
            margin-bottom: 10px;
            color: #2c3e50;
        }
        
        /* 반응형 디자인 */
        @media (max-width: 768px) {
            .sidebar {
                width: 250px;
            }
            
            .file-content-wrapper {
                padding: 20px 30px;
            }
            
            .file-title {
                font-size: 2em;
            }
        }
        
        /* 스크롤바 스타일 */
        .sidebar::-webkit-scrollbar {
            width: 6px;
        }
        
        .sidebar::-webkit-scrollbar-track {
            background: #2c3e50;
        }
        
        .sidebar::-webkit-scrollbar-thumb {
            background: #4a5f7a;
            border-radius: 3px;
        }
        
        .main-content::-webkit-scrollbar {
            width: 8px;
        }
        
        .main-content::-webkit-scrollbar-track {
            background: #f1f1f1;
        }
        
        .main-content::-webkit-scrollbar-thumb {
            background: #bdc3c7;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="sidebar">
            <div class="sidebar-header">
                <h1>📚 문서</h1>
                <div class="subtitle">프로젝트 문서</div>
            </div>
            ${sidebarHTML}
        </div>
        
        <div class="main-content">
            ${mainContentHTML || '<div class="empty-state"><h2>문서가 없습니다</h2><p>docs 폴더에 마크다운 파일을 추가해보세요.</p></div>'}
        </div>
    </div>

    <script>
        // 카테고리 토글 기능
        function toggleCategory(categoryId, titleElement) {
            const categoryElement = document.getElementById('category-' + categoryId);
            
            if (categoryElement) {
                categoryElement.classList.toggle('collapsed');
            }
            if (titleElement) {
                titleElement.classList.toggle('collapsed');
            }
        }
        
        // 파일 표시 기능
        function showFile(fileId, clickedElement) {
            // 모든 파일 콘텐츠 숨기기
            document.querySelectorAll('.file-content-wrapper').forEach(el => {
                el.classList.remove('active');
            });
            
            // 모든 사이드바 파일에서 active 클래스 제거
            document.querySelectorAll('.sidebar-file').forEach(el => {
                el.classList.remove('active');
            });
            
            // 선택된 파일 표시
            const contentElement = document.getElementById('content-' + fileId);
            if (contentElement) {
                contentElement.classList.add('active');
            }
            
            // 선택된 사이드바 파일에 active 클래스 추가
            if (clickedElement) {
                clickedElement.classList.add('active');
            }
        }
        
        // 초기 설정: 첫 번째 카테고리 열기
        document.addEventListener('DOMContentLoaded', function() {
            // 첫 번째 카테고리 열기
            const firstCategory = document.querySelector('.sidebar-category-title');
            if (firstCategory) {
                const categoryId = firstCategory.getAttribute('onclick').match(/'([^']+)'/)[1];
                const categoryElement = document.getElementById('category-' + categoryId);
                if (categoryElement) {
                    // 첫 번째 카테고리는 기본으로 열려있도록 설정
                    categoryElement.classList.remove('collapsed');
                    firstCategory.classList.remove('collapsed');
                }
            }
            
            // 첫 번째 파일 자동 선택
            const firstFile = document.querySelector('.sidebar-file');
            if (firstFile) {
                firstFile.classList.add('active');
                // 첫 번째 파일 내용도 자동으로 표시
                const onclick = firstFile.getAttribute('onclick');
                if (onclick) {
                    const fileId = onclick.match(/'([^']+)'/)[1];
                    const contentElement = document.getElementById('content-' + fileId);
                    if (contentElement) {
                        contentElement.classList.add('active');
                    }
                }
            }
        });
    </script>
</body>
</html>
    `;
  }

  // 문서 생성
  generate() {
    const files = this.scanMarkdownFiles();
    const html = this.generateHTML(files);
    
    fs.writeFileSync(this.outputFile, html);
    console.log(`✅ 문서가 생성되었습니다: ${this.outputFile}`);
    console.log(`📁 처리된 파일: ${files.length}개`);
  }

  // 파일 감시 시작
  watch() {
    console.log('🔍 파일 변경 감시 시작...');
    
    const watcher = chokidar.watch(['./README.md', './docs/**/*.md'], {
      ignored: this.excludeFiles.map(f => `./docs/${f}`),
      persistent: true
    });

    watcher.on('change', (path) => {
      console.log(`📝 파일 변경됨: ${path}`);
      this.generate();
    });

    watcher.on('add', (path) => {
      console.log(`➕ 파일 추가됨: ${path}`);
      this.generate();
    });

    watcher.on('unlink', (path) => {
      console.log(`🗑️ 파일 삭제됨: ${path}`);
      this.generate();
    });

    // 초기 생성
    this.generate();
  }
}

// CLI 실행
if (require.main === module) {
  const generator = new DocsGenerator();
  
  const args = process.argv.slice(2);
  if (args.includes('--watch') || args.includes('-w')) {
    generator.watch();
  } else {
    generator.generate();
  }
}

module.exports = DocsGenerator;