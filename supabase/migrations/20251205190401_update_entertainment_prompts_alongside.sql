-- Update TV Program: add user alongside cast instead of as a character
UPDATE public.styles
SET
  prompt = 'Create a photo of the person from the input image appearing alongside the cast of "{{show_name}}". The person is {{character_description}}. {{customization}} Dress the input person in clothing and style appropriate to the show''s setting and era. Show them interacting naturally with the show''s characters in an iconic scene or setting from the series. The input person''s face must be clearly recognizable. Professional TV production quality lighting.',
  input_schema = '{
    "fields": [
      {
        "id": "show_name",
        "label": "TV Show Name",
        "type": "text",
        "required": true,
        "placeholder": "e.g., Game of Thrones, The Office, Stranger Things"
      },
      {
        "id": "character_description",
        "label": "How You Appear",
        "type": "text",
        "required": true,
        "placeholder": "e.g., wearing medieval clothing, in a Dunder Mifflin polo, in 80s style"
      },
      {
        "id": "customization",
        "label": "Additional Details (optional)",
        "type": "text",
        "required": false,
        "placeholder": "e.g., in a dramatic scene, at the office, in the Upside Down"
      }
    ]
  }'::jsonb
WHERE id = 'tv-program';

-- Update Musician/Pop Star: add user alongside artist instead of as band member
UPDATE public.styles
SET
  prompt = 'Create a photo of the person(s) from the input image(s) appearing {{venue}} alongside {{artist_name}}. Show them performing together or posing as if they joined the artist on stage. {{customization}} Dress the input person(s) in stage-appropriate clothing matching the artist''s style and era. Each input person''s face must be clearly recognizable with their features preserved. Professional concert photography aesthetic with dramatic stage lighting and high production value.'
WHERE id = 'musician-star';

-- Update Movie Scene: add user alongside characters instead of as a character
UPDATE public.styles
SET
  prompt = 'Create a cinematic scene from "{{movie_name}}" with the person from the input image appearing alongside the movie''s characters. The person is {{character_description}}. {{customization}} Dress the input person in clothing and style appropriate to the movie''s setting and era. Show them in an iconic scene or setting from the film, interacting with the original characters. The input person''s face must be clearly recognizable. Match the movie''s cinematography, color grading, and aesthetic. Hollywood-quality production with appropriate lighting and composition.',
  input_schema = '{
    "fields": [
      {
        "id": "movie_name",
        "label": "Movie Name",
        "type": "text",
        "required": true,
        "placeholder": "e.g., The Matrix, Titanic, Star Wars"
      },
      {
        "id": "character_description",
        "label": "How You Appear",
        "type": "text",
        "required": true,
        "placeholder": "e.g., in a black trench coat, in 1910s formal wear, in Jedi robes"
      },
      {
        "id": "customization",
        "label": "Additional Details (optional)",
        "type": "text",
        "required": false,
        "placeholder": "e.g., in the lobby shootout, on the ship deck, in the cantina"
      }
    ]
  }'::jsonb
WHERE id = 'movie-scene';
