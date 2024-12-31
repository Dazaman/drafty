import streamlit as st
import pandas as pd


def load_current_gw_teams():
    # Read current gw, use as gw[0]
    with open(r"data_gw", "r") as fp:
        gw = fp.readlines()
    # Read in team names
    with open(r"data_teams", "r") as fp:
        t = fp.readlines()
        teams = [i.strip() for i in t]

    return gw[0], teams


def transactions(col_names, int_cols):
    top_n = pd.read_csv("data/top_df.csv")
    bottom_n = pd.read_csv("data/bottom_df.csv")

    top_n = top_n.rename(columns=col_names)
    bottom_n = bottom_n.rename(columns=col_names)

    top_n[int_cols] = top_n[int_cols].astype(int)
    bottom_n[int_cols] = bottom_n[int_cols].astype(int)

    return top_n, bottom_n


def bench():
    bench_pts = pd.read_csv("data/bench_pts.csv")
    total_bench_pts = pd.read_csv("data/total_bench_pts.csv")

    return bench_pts, total_bench_pts


st.header("Transfers!")
st.caption(
    "** Currently does not take into account whether Transferred in player was on the bench or not."
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


blunders, smart_moves, transactions_gw = c2.tabs(
    [
        "Top Blunders",
        "Top Transfers",
        "Transactions by GW",
    ]
)

with blunders:
    st.subheader("Top 10 Blunders - Should have held on!")
    st.dataframe(
        bottom_n.style.background_gradient(cmap="YlOrRd_r", subset=["Net Points"]),
        hide_index=True,
        use_container_width=True,
    )

with smart_moves:
    st.subheader("Top 10 Smart Transfers - Timely pick!")
    st.dataframe(
        top_n.style.background_gradient(cmap="YlGn", subset=["Net Points"]),
        hide_index=True,
        use_container_width=True,
    )

with transactions_gw:
    st.subheader("Ranked Transactions by GW")

    option = st.selectbox("Blunders for which GW?", [i for i in range(1, int(gw) + 1)])
    blunders_df = pd.read_csv(f"data/blunders_{option}.csv")
    blunders_df_sorted = blunders_df.sort_values(by="net_pts", ascending=True)
    blunders_df_sorted = blunders_df_sorted.rename(columns=col_names)

    blunders_df_sorted[int_cols] = blunders_df_sorted[int_cols].astype(int)
    st.dataframe(
        blunders_df_sorted.style.background_gradient(
            cmap="coolwarm", subset=["Net Points"]
        ),
        hide_index=True,
        use_container_width=True,
    )
