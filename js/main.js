document.addEventListener('DOMContentLoaded', function() {
    console.log('Main page functionality loaded');

    // Search functionality
    const searchInput = document.getElementById('searchInput');
    const resourceCards = document.querySelectorAll('.resource-card');

    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();

            resourceCards.forEach(card => {
                const title = card.querySelector('.resource-title')?.textContent.toLowerCase() || '';
                const description = card.querySelector('.resource-description')?.textContent.toLowerCase() || '';
                const links = Array.from(card.querySelectorAll('.resource-links a'))
                    .map(link => link.textContent.toLowerCase()).join(' ');

                const matches = title.includes(searchTerm) ||
                               description.includes(searchTerm) ||
                               links.includes(searchTerm);

                card.style.display = matches || searchTerm === '' ? 'block' : 'none';
            });
        });
    }

    // Card expansion
    document.querySelectorAll('.resource-card:not(.coming-soon)').forEach(card => {
        card.addEventListener('click', function(e) {
            if (e.target.tagName === 'A') return;
            this.classList.toggle('expanded');
        });
    });

    // Prevent clicks on coming soon cards
    document.querySelectorAll('.coming-soon').forEach(card => {
        card.addEventListener('click', function(e) {
            e.preventDefault();
        });
    });
});


