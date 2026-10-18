// Interactive filtering logic for search bar and category dropdowns
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput');
  const categoryFilter = document.getElementById('categoryFilter');
  const cards = document.querySelectorAll('.card');

  function filterCards() {
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const selectedCategory = categoryFilter ? categoryFilter.value.toLowerCase() : 'all';

    cards.forEach(card => {
      const title = card.querySelector('.card-title')?.textContent.toLowerCase() || '';
      const desc = card.querySelector('.card-desc')?.textContent.toLowerCase() || '';
      const category = card.getAttribute('data-category')?.toLowerCase() || '';

      const matchesSearch = title.includes(query) || desc.includes(query);
      const matchesCategory = selectedCategory === 'all' || category === selectedCategory;

      if (matchesSearch && matchesCategory) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  }

  if (searchInput) searchInput.addEventListener('input', filterCards);
  if (categoryFilter) categoryFilter.addEventListener('change', filterCards);
});