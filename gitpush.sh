#Usage sh gitpush.sh "Your commit message"
echo "\"$1\"";
git add .;
git commit -m "\"$1\"";
git push origin master;
git subtree push --prefix build origin gh-pages;