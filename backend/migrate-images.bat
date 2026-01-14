@echo off
echo Running migration to add images column to topics and posts...
node src\migrations\add-images-to-topics-posts.js
pause
