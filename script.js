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
const previewBackdrop = document.getElementById('previewBackdrop');
const previewOverlay = document.getElementById('previewOverlay');
const previewImage = document.getElementById('previewImage');
const previewCaption = document.getElementById('previewCaption');
const customCursor = document.getElementById('customCursor');
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let previewTimer = null;
let previewVisible = false;
let activePreviewCard = null;

function updateColumns(value) {
    const safeValue = Math.max(1, Math.min(6, Number(value) || 3));
    gallery.style.setProperty('--columns', safeValue);
    columnRange.value = safeValue;
    columnValue.textContent = safeValue;
}

function hidePreview() {
    if (previewTimer) {
        window.clearTimeout(previewTimer);
        previewTimer = null;
    }

    if (activePreviewCard) {
        activePreviewCard.classList.remove('is-active');
        activePreviewCard = null;
    }

    previewBackdrop.classList.remove('is-visible');
    previewOverlay.classList.remove('is-visible');
    previewVisible = false;
}

function showPreview(imageElement) {
    const previewUrl = imageElement.dataset.previewUrl || `https://drive.google.com/thumbnail?id=${imageElement.dataset.imageId}&sz=w1400`;
    const previewWidth = Math.min(window.innerWidth * 0.95, 980);
    const previewHeight = Math.min(window.innerHeight * 0.92, 980);
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const nextLeft = viewportWidth / 2;
    const nextTop = viewportHeight / 2;

    previewImage.src = previewUrl;
    previewCaption.textContent = imageElement.alt || 'Wallpaper preview';
    previewOverlay.style.width = `${previewWidth}px`;
    previewOverlay.style.maxHeight = `${previewHeight}px`;
    previewOverlay.style.left = `${nextLeft}px`;
    previewOverlay.style.top = `${nextTop}px`;
    previewBackdrop.classList.add('is-visible');
    previewOverlay.classList.add('is-visible');
    previewVisible = true;
}

function bindGalleryInteractions() {
    gallery.querySelectorAll('.card').forEach((card) => {
        const imageElement = card.querySelector('img');
        const downloadButton = card.querySelector('.download-btn');

        imageElement.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();

            if (activePreviewCard === card) {
                hidePreview();
                return;
            }

            if (activePreviewCard) {
                activePreviewCard.classList.remove('is-active');
            }

            activePreviewCard = card;
            activePreviewCard.classList.add('is-active');

            showPreview(imageElement);
        });

        downloadButton.addEventListener('click', (event) => {
            event.stopPropagation();
        });

    });
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
                <img src="${previewUrl}" alt="${img.name}" loading="lazy" data-image-id="${img.id}" data-preview-url="https://drive.google.com/thumbnail?id=${img.id}&sz=w1400">
                <div class="card-info">
                    <span>${img.name}</span>
                    <a href="${img.url}" target="_blank" rel="noreferrer" class="download-btn">Download</a>
                </div>
            </article>
        `;
    }).join('');

    bindGalleryInteractions();
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

document.addEventListener('contextmenu', (event) => {
    event.preventDefault();
});

window.addEventListener('pointermove', (event) => {
    customCursor.style.left = `${event.clientX}px`;
    customCursor.style.top = `${event.clientY}px`;

    if (previewVisible) {
        hidePreview();
    }
});

window.addEventListener('pointerdown', () => {
    hidePreview();
});

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
