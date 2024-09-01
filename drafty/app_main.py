import streamlit as st
from streamlit_extras.colored_header import colored_header

st.set_page_config(
    page_title="Draft 24/25",
    page_icon="⚽",
    # initial_sidebar_state="collapsed",
    layout="wide",
)

if "role" not in st.session_state:
    st.session_state.role = None


def main():
    st.title("Drafty 24/25")
    colored_header(
        label="Keep track of standings, analyse waivers and team selection",
        description="Hindsight is 20/20 and none of this matters, I just had some time this christmas break ..",
        color_name="violet-70",
    )

    st.sidebar.markdown(" ## FPL Draft League 24/25")
    st.sidebar.markdown(
        "Bringing it back to answer the same question: Why am I so bad at all this ..."
    )
    st.sidebar.info(
        "Previos seasons page is at https://fpldraft.streamlit.app/",
        icon="ℹ️",
    )

    pg = st.navigation([st.Page("app_draft.py"), st.Page("app_transfers.py")])

    pg.run()


if __name__ == "__main__":
    main()
