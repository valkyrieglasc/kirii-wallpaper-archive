const API_URL = 'https://script.google.com/macros/s/AKfycbzIh0iMNDldhe3ik7L_z8nUByaOOi4Hd24q0QoGr4GTt6gR7i9ZYn9zZw2hDULAKODJ/exec';
let wallpapers = [];
const gallery = document.getElementById('gallery');
const columnRange = document.getElementById('columnRange');
const columnValue = document.getElementById('columnValue');
const noteWindow = document.getElementById('noteWindow');
const noteBubble = document.getElementById('noteBubble');
const noteHeader = document.getElementById('noteHeader');
const noteBody = document.getElementById('noteBody');
const minimizeButton = document.getElementById('minimizeNote');
const scrollTopButton = document.getElementById('scrollTopButton');
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

function updateColumns(value) {
    const safeValue = Math.max(1, Math.min(6, Number(value) || 3));
    gallery.style.setProperty('--columns', safeValue);
    columnRange.value = safeValue;
    columnValue.textContent = safeValue;
}

function renderGallery(items) {
    if (!items.length) {
        gallery.innerHTML = '<p class="state">No matches in archive.</p>';
        return;
    }

    gallery.innerHTML = items.map((img, index) => {
        const previewUrl = `https://drive.google.com/thumbnail?id=${img.id}&sz=w1000`;

        return `
            <article class="card" style="animation-delay:${index * 70}ms">
                <img src="${previewUrl}" alt="${img.name}" loading="lazy">
                <div class="card-info">
                    <span>${img.name}</span>
                    <a href="${img.url}" target="_blank" rel="noreferrer" class="download-btn">View</a>
                </div>
            </article>
        `;
    }).join('');
}

function filterWallpapers(query) {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
        renderGallery(wallpapers);
        return;
    }

    const filtered = wallpapers.filter((img) => {
        const haystack = `${img.name} ${img.url}`.toLowerCase();
        return haystack.includes(normalized);
    });

    renderGallery(filtered);
}

async function fetchWallpapers() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        wallpapers = Array.isArray(data) ? data : [];

        if (!wallpapers.length) {
            gallery.innerHTML = '<p class="state">No wallpapers found in folder.</p>';
            return;
        }

        renderGallery(wallpapers);
    } catch (error) {
        console.error('Error fetching images:', error);
        gallery.innerHTML = '<p class="state">Failed to load wallpapers. Check console logs.</p>';
    }
}

async function loadNoteContent() {
    try {
        const response = await fetch('note-content.html');
        const markdown = await response.text();
        noteBody.innerHTML = convertMarkdownToHtml(markdown);
    } catch (error) {
        console.error('Error loading note content:', error);
        noteBody.innerHTML = '<p>Note content unavailable.</p>';
    }
}

function setNoteVisible(isVisible) {
    noteWindow.classList.toggle('is-hidden', !isVisible);
    noteBubble.classList.toggle('is-visible', !isVisible);
}

function formatInlineMarkdown(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
}

function convertMarkdownToHtml(markdown) {
    const lines = markdown.replace(/\r\n/g, '\n').split('\n');
    let html = '';
    let inList = false;

    const closeList = () => {
        if (inList) {
            html += '</ul>';
            inList = false;
        }
    };

    lines.forEach((line) => {
        const trimmed = line.trim();

        if (!trimmed) {
            closeList();
            return;
        }

        const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
        if (headingMatch) {
            closeList();
            const level = headingMatch[1].length;
            const content = formatInlineMarkdown(headingMatch[2]);
            html += `<h${level}>${content}</h${level}>`;
            return;
        }

        if (/^[-*]\s+/.test(trimmed)) {
            if (!inList) {
                html += '<ul>';
                inList = true;
            }
            html += `<li>${formatInlineMarkdown(trimmed.replace(/^[-*]\s+/, ''))}</li>`;
            return;
        }

        closeList();
        html += `<p>${formatInlineMarkdown(trimmed)}</p>`;
    });

    closeList();
    return html;
}

noteHeader.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button')) {
        return;
    }

    isDragging = true;
    const rect = noteWindow.getBoundingClientRect();
    dragOffsetX = event.clientX - rect.left;
    dragOffsetY = event.clientY - rect.top;
    noteHeader.style.cursor = 'grabbing';
});

window.addEventListener('pointermove', (event) => {
    if (!isDragging) {
        return;
    }

    const nextLeft = event.clientX - dragOffsetX;
    const nextTop = event.clientY - dragOffsetY;
    const maxLeft = window.innerWidth - noteWindow.offsetWidth - 16;
    const maxTop = window.innerHeight - noteWindow.offsetHeight - 16;

    noteWindow.style.left = `${Math.max(16, Math.min(nextLeft, maxLeft))}px`;
    noteWindow.style.top = `${Math.max(16, Math.min(nextTop, maxTop))}px`;
    noteWindow.style.right = 'auto';
});

window.addEventListener('pointerup', () => {
    isDragging = false;
    noteHeader.style.cursor = 'grab';
});

minimizeButton.addEventListener('click', () => setNoteVisible(false));
noteBubble.addEventListener('click', () => setNoteVisible(true));
scrollTopButton.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
columnRange.addEventListener('input', (event) => updateColumns(event.target.value));
document.getElementById('searchInput').addEventListener('input', (event) => filterWallpapers(event.target.value));

updateColumns(columnRange.value);
setNoteVisible(true);
loadNoteContent();
fetchWallpapers();
