echo "Refreshing the Data"

rm -r drafty/data/
rm drafty/drapht.db

poetry run python drafty/data_pipeline.py --refresh True

poetry run streamlit run drafty/app_main.py