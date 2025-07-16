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

    let categoriesHTML = '';
    Object.entries(categories).forEach(([category, categoryFiles]) => {
      categoriesHTML += `
        <div class="category">
          <h2 class="category-title">${category}</h2>
          <div class="files">
            ${categoryFiles.map(file => `
              <div class="file-item">
                <h3 class="file-title">${file.title}</h3>
                <div class="file-meta">
                  <span class="file-date">${new Date(file.date).toLocaleDateString()}</span>
                  <span class="file-path">${file.path}</span>
                </div>
                <div class="file-content">
                  ${marked(file.content)}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
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
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: white;
            border-radius: 8px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .header h1 {
            color: #2c3e50;
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .header .subtitle {
            color: #7f8c8d;
            font-size: 1.1em;
        }
        
        .category {
            background: white;
            border-radius: 8px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .category-title {
            color: #2c3e50;
            font-size: 1.8em;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #3498db;
        }
        
        .file-item {
            margin-bottom: 40px;
            padding-bottom: 30px;
            border-bottom: 1px solid #ecf0f1;
        }
        
        .file-item:last-child {
            border-bottom: none;
        }
        
        .file-title {
            color: #2c3e50;
            font-size: 1.4em;
            margin-bottom: 10px;
        }
        
        .file-meta {
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
            font-size: 0.9em;
            color: #7f8c8d;
        }
        
        .file-date {
            background: #e8f4f8;
            padding: 4px 8px;
            border-radius: 4px;
        }
        
        .file-path {
            font-family: monospace;
            background: #f8f9fa;
            padding: 4px 8px;
            border-radius: 4px;
        }
        
        .file-content {
            line-height: 1.7;
        }
        
        .file-content h1, .file-content h2, .file-content h3 {
            color: #2c3e50;
            margin: 20px 0 10px 0;
        }
        
        .file-content p {
            margin-bottom: 15px;
        }
        
        .file-content pre {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 4px;
            overflow-x: auto;
            border-left: 4px solid #3498db;
        }
        
        .file-content code {
            background: #f8f9fa;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'SF Mono', Monaco, monospace;
        }
        
        .file-content blockquote {
            border-left: 4px solid #3498db;
            padding-left: 20px;
            margin: 20px 0;
            color: #7f8c8d;
        }
        
        .file-content ul, .file-content ol {
            margin: 10px 0 10px 30px;
        }
        
        .file-content li {
            margin-bottom: 5px;
        }
        
        .last-updated {
            text-align: center;
            color: #7f8c8d;
            font-size: 0.9em;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ecf0f1;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📚 프로젝트 문서</h1>
            <div class="subtitle">개발 중 생성된 문서들을 한눈에 확인하세요</div>
        </div>
        
        ${categoriesHTML}
        
        <div class="last-updated">
            마지막 업데이트: ${new Date().toLocaleString()}
        </div>
    </div>
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