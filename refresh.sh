echo "Hello"

rm -r data/
rm drapht.db

poetry run python drapht_data.py --refresh True