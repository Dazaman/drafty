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


st.header("Points lost on Bench")
st.caption(
    "* Current Method of Calculation is to compare MIN pts per position (GK, DEF, MID, FWD) of starting 11 vs MAX pts per position on bench."
)
st.caption(
    "* Only cases where the bench points were higher than starting are displayed as 'lost' points"
)
st.caption(
    "* It currently doesn't account for the case where for example two defs are substituted in"
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


total_bench_pts_, bench_pts_ = c2.tabs(
    [
        "Total Bench Points",
        "Bench Points by Position",
    ]
)
with total_bench_pts_:
    st.dataframe(
        total_bench_pts.style.background_gradient(
            cmap="YlOrRd_r", subset=["bench_pts"]
        ),
        hide_index=True,
        use_container_width=True,
    )
with bench_pts_:
    st.dataframe(
        bench_pts.style.background_gradient(cmap="YlOrRd_r", subset=["pts_lost"]),
        hide_index=True,
        use_container_width=True,
    )

st.write(f"You are logged in as {st.session_state.role}.")
