-- Скрипт для создания категории "Все темы"
-- Эта категория будет показывать все темы из всех категорий

-- Проверяем, существует ли уже категория "Все темы"
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Все темы') THEN
        INSERT INTO categories (name, description, created_at)
        VALUES ('Все темы', 'Все темы форума', CURRENT_TIMESTAMP);
        RAISE NOTICE 'Категория "Все темы" успешно создана';
    ELSE
        RAISE NOTICE 'Категория "Все темы" уже существует';
    END IF;
END $$;
