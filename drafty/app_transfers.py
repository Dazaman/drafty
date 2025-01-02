import streamlit as st
import pandas as pd


def load_current_gw_teams():
    # Read current gw, use as gw[0]
    with open(r"drafty/data_gw", "r") as fp:
        gw = fp.readlines()
    # Read in team names
    with open(r"drafty/data_teams", "r") as fp:
        t = fp.readlines()
        teams = [i.strip() for i in t]

    return gw[0], teams


def transactions(col_names, int_cols):
    top_n = pd.read_csv("drafty/data/top_df.csv")
    bottom_n = pd.read_csv("drafty/data/bottom_df.csv")

    top_n = top_n.rename(columns=col_names)
    bottom_n = bottom_n.rename(columns=col_names)

    top_n[int_cols] = top_n[int_cols].astype(int)
    bottom_n[int_cols] = bottom_n[int_cols].astype(int)

    return top_n, bottom_n


def bench():
    bench_pts = pd.read_csv("drafty/data/bench_pts.csv")
    total_bench_pts = pd.read_csv("drafty/data/total_bench_pts.csv")

    return bench_pts, total_bench_pts


st.header("🔄 Transfer Analysis")
st.caption(
    "Analyze the impact of your transfer decisions throughout the season. "
    "Track both successful moves and learning opportunities."
)

col_names = {
    "team": "Team Name",
    "waiver_or_free": "Type",
    "waiver_gw": "Transfer GW",
    "next_gw": "Next GW",
    "player_in": "IN",
    "player_in_pts": "IN Pts",
    "player_out": "OUT",
    "player_out_pts": "OUT Pts",
    "net_pts": "Net Points",
}

int_cols = ["Transfer GW", "Next GW", "IN Pts", "OUT Pts", "Net Points"]

gw, teams = load_current_gw_teams()
top_n, bottom_n = transactions(col_names, int_cols)
bench_pts, total_bench_pts = bench()

# Space out the maps so the first one is 2x the size of the other three
c1, c2, c3 = st.columns((0.05, 0.8, 0.05))


# Create tabs with emojis and better labels
blunders, smart_moves, transactions_gw = c2.tabs(
    [
        "❌ Worst Transfers",
        "✅ Best Transfers",
        "📊 Transfer History",
    ]
)

with blunders:
    st.subheader("🔽 Top 10 Transfer Blunders")
    st.error("These transfers lost the most points - lessons learned!")

    # Add summary metrics
    worst_transfer = bottom_n.iloc[0]
    most_blunders = bottom_n["Team Name"].value_counts().head(1)
    col1, col2, col3 = st.columns(3)

    # For blunders section
    with col1:
        st.metric(
            "Most Frequent Blunderer",
            f"{most_blunders.index[0]}",
            help=f"{most_blunders.values[0]} times in bottom 10",
            delta=int(most_blunders.values[0]),
            delta_color="inverse",
        )
    with col2:
        st.metric(
            "Biggest Points Loss",
            f"{worst_transfer['Net Points']} pts",
            help=f"Lost {abs(worst_transfer['Net Points'])} points",
            delta=int(worst_transfer["Net Points"]),
            delta_color="inverse",
        )
    with col3:
        st.metric(
            "Most Unfortunate Manager",
            worst_transfer["Team Name"],
            help=f"-{abs(worst_transfer['Net Points'])} pts",
            delta=int(-abs(worst_transfer["Net Points"])),
            delta_color="inverse",
        )
    st.dataframe(
        bottom_n.style.background_gradient(cmap="YlOrRd_r", subset=["Net Points"]),
        hide_index=True,
        use_container_width=True,
    )

with smart_moves:
    st.subheader("🔼 Top 10 Smart Transfers")
    st.success("These transfers gained the most points - well done!")

    # Add summary metrics
    best_transfer = top_n.iloc[0]
    most_smart = top_n["Team Name"].value_counts().head(1)
    col1, col2, col3 = st.columns(3)

    # For smart moves section
    with col1:
        st.metric(
            "Most Frequent Smart Mover",
            f"{most_smart.index[0]}",
            help=f"{most_smart.values[0]} times in top 10",
            delta=int(most_smart.values[0]),
            delta_color="normal",
        )
    with col2:
        st.metric(
            "Biggest Points Gain",
            f"{best_transfer['Net Points']} pts",
            help=f"Gained {best_transfer['Net Points']} points",
            delta=int(best_transfer["Net Points"]),
            delta_color="normal",
        )
    with col3:
        st.metric(
            "Smartest Manager",
            best_transfer["Team Name"],
            help=f"+{best_transfer['Net Points']} pts",
            delta=int(best_transfer["Net Points"]),
            delta_color="normal",
        )

    st.dataframe(
        top_n.style.background_gradient(cmap="YlGn", subset=["Net Points"]),
        hide_index=True,
        use_container_width=True,
    )

with transactions_gw:
    st.subheader("📅 Gameweek Transfer Analysis")

    with st.container():
        st.write("Select a gameweek to analyze its transfers:")
        col1, col2 = st.columns([3, 1])
        with col1:
            option = st.selectbox(
                "Choose Gameweek",
                [i for i in range(1, int(gw) + 1)],
                format_func=lambda x: f"Gameweek {x}",
            )

    # ...existing code for blunders_df processing...
    blunders_df = pd.read_csv(f"drafty/data/blunders_{option}.csv")
    blunders_df_sorted = blunders_df.sort_values(by="net_pts", ascending=True)
    blunders_df_sorted = blunders_df_sorted.rename(columns=col_names)

    blunders_df_sorted[int_cols] = blunders_df_sorted[int_cols].astype(int)

    st.write(f"#### Transfer Results for Gameweek {option}")
    st.dataframe(
        blunders_df_sorted.style.background_gradient(
            cmap="coolwarm", subset=["Net Points"]
        ),
        hide_index=True,
        use_container_width=True,
    )
