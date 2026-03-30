-- Carousel slides (card by card)
CREATE TABLE carousel_slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  slide_number INTEGER NOT NULL,
  image_url TEXT,
  extracted_text TEXT,
  has_text_overlay BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, slide_number)
);

CREATE INDEX idx_carousel_slides_post ON carousel_slides(post_id);
