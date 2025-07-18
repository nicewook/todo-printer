#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const { marked } = require('marked');
const matter = require('gray-matter');

class DocsGenerator {
  constructor(options = {}) {
    // 프로젝트 루트 디렉터리 찾기
    this.projectRoot = this.findProjectRoot();
    
    // config.json 로드
    this.config = this.loadConfig();
    
    this.docsDir = path.resolve(this.projectRoot, this.config.docsDir || 'docs');
    this.excludeFiles = this.config.excludeFiles || ['temp.md', 'draft.md'];
    this.outputFile = path.resolve(this.projectRoot, this.config.outputFile || 'index.html');
    this.theme = options.theme || this.config.theme || 'default';
    this.stylesDir = path.join(__dirname, 'styles');
  }

  // 프로젝트 루트 디렉터리 찾기
  findProjectRoot() {
    let currentDir = __dirname;
    while (currentDir !== path.dirname(currentDir)) {
      if (fs.existsSync(path.join(currentDir, 'package.json'))) {
        return currentDir;
      }
      currentDir = path.dirname(currentDir);
    }
    throw new Error('프로젝트 루트를 찾을 수 없습니다 (package.json 파일이 없음)');
  }

  // config.json 로드
  loadConfig() {
    const configPath = path.join(__dirname, 'config.json');
    if (fs.existsSync(configPath)) {
      try {
        return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      } catch (error) {
        console.warn('⚠️  config.json 파싱 오류, 기본값 사용:', error.message);
        return {};
      }
    }
    return {};
  }

  // 파일 제외 여부 확인 (패턴 매칭 지원)
  isExcluded(filename) {
    return this.excludeFiles.some(pattern => {
      // 와일드카드 패턴 지원
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(filename);
      }
      // 정확한 이름 매칭
      return filename === pattern;
    });
  }

  // CSS 파일 로드
  loadCSS() {
    const cssFile = path.join(this.stylesDir, `${this.theme}.css`);
    if (fs.existsSync(cssFile)) {
      return fs.readFileSync(cssFile, 'utf-8');
    }
    // 기본 CSS 파일이 없으면 default.css 사용
    const defaultCssFile = path.join(this.stylesDir, 'default.css');
    if (fs.existsSync(defaultCssFile)) {
      return fs.readFileSync(defaultCssFile, 'utf-8');
    }
    throw new Error('CSS 파일을 찾을 수 없습니다.');
  }

  // 마크다운 파일들을 스캔하고 메타데이터 추출
  scanMarkdownFiles() {
    const files = [];
    
    // README.md 포함
    const readmePath = path.join(this.projectRoot, 'README.md');
    if (fs.existsSync(readmePath)) {
      const content = fs.readFileSync(readmePath, 'utf-8');
      const { data, content: markdownContent } = matter(content);
      files.push({
        path: path.relative(this.projectRoot, readmePath),
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
        .filter(file => !this.isExcluded(file));

      docFiles.forEach(file => {
        const filePath = path.join(this.docsDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const { data, content: markdownContent } = matter(content);
        
        files.push({
          path: path.relative(this.projectRoot, filePath),
          title: data.title || file.replace('.md', ''),
          category: data.category || this.config.defaultCategory || 'Documentation',
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

    // CSS 로드
    const cssContent = this.loadCSS();

    return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>프로젝트 문서</title>
    <style>
${cssContent}
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
    
    const watchPaths = [
      path.join(this.projectRoot, 'README.md'),
      path.join(this.docsDir, '**/*.md')
    ];
    
    console.log('📁 감시 중인 경로들:');
    watchPaths.forEach(p => console.log(`   - ${p}`));
    
    const watcher = chokidar.watch(watchPaths, {
      ignored: this.excludeFiles.map(f => path.join(this.docsDir, f)),
      persistent: true
    });

    watcher.on('ready', () => {
      console.log('✅ 파일 감시 준비 완료');
      const watched = watcher.getWatched();
      console.log('🔎 감시 중인 파일들:', Object.keys(watched).length, '개 디렉터리');
    });

    watcher.on('change', (filePath) => {
      console.log(`📝 파일 변경됨: ${path.relative(this.projectRoot, filePath)}`);
      this.generate();
    });

    watcher.on('add', (filePath) => {
      console.log(`➕ 파일 추가됨: ${path.relative(this.projectRoot, filePath)}`);
      this.generate();
    });

    watcher.on('unlink', (filePath) => {
      console.log(`🗑️ 파일 삭제됨: ${path.relative(this.projectRoot, filePath)}`);
      this.generate();
    });

    watcher.on('error', (error) => {
      console.error('❌ 파일 감시 오류:', error);
    });

    // 초기 생성
    this.generate();
  }
}

// CLI 실행
if (require.main === module) {
  const args = process.argv.slice(2);
  
  // 테마 옵션 파싱
  const themeIndex = args.indexOf('--theme');
  let theme = 'default';
  if (themeIndex !== -1 && args[themeIndex + 1]) {
    theme = args[themeIndex + 1];
  }
  
  const generator = new DocsGenerator({ theme });
  
  if (args.includes('--watch') || args.includes('-w')) {
    generator.watch();
  } else {
    generator.generate();
  }
}

module.exports = DocsGenerator;