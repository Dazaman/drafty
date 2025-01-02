import streamlit as st
import pandas as pd
import plotly.express as px


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


# Custom CSS for better styling
st.markdown(
    """
<style>
.main > div {padding: 2rem 1rem;}
.dataframe {margin: 1rem 0;}
.stTabs {margin-top: 1.5rem;}
</style>
""",
    unsafe_allow_html=True,
)

# Main header with help
st.header("Squad Selection Analysis 📊")
with st.expander("ℹ️ How to use this dashboard"):
    st.markdown(
        """
    - Current Method of Calculation is to compare MIN pts per position (GK, DEF, MID, FWD) of starting 11 vs MAX pts per position on bench.
    - Only cases where the bench points were higher than starting are displayed as 'lost' points
    - It currently doesn't account for the edge case where two of the same position players are subbed in
    """
    )

# Load data with spinner
with st.spinner("Loading data..."):
    gw, teams = load_current_gw_teams()
    top_n, bottom_n = transactions(col_names, int_cols)
    bench_pts, total_bench_pts = bench()

# Main tabs
overview_tab, detail_tab = st.tabs(["Overview 📈", "Detailed Analysis 🔍"])

with overview_tab:
    # # Summary metrics remain the same
    # col1, col2 = st.columns(2)
    # with col1:
    #     total_pts_lost = total_bench_pts["bench_pts"].sum()
    #     st.metric("Total Points on Bench", f"{total_pts_lost:,}")
    # with col2:
    #     avg_pts_lost = total_bench_pts["bench_pts"].mean()
    #     st.metric("Avg Points per Team", f"{avg_pts_lost:.1f}")

    # Visualization selector
    viz_type = st.radio(
        "Choose visualization",
        ["Bar Chart", "Scatter Plot", "Box Plot"],
        horizontal=True,
    )

    if viz_type == "Bar Chart":
        try:
            fig = px.bar(
                total_bench_pts,
                x="name",
                y="bench_pts",
                title="Bench Points by Team",
                color="bench_pts",
                height=600,  # Control height
                width=800,  # Control width
                color_continuous_scale=["red", "yellow", "green"],  # Red to green scale
                text="bench_pts",  # Show values on bars
            )

            # Improve layout
            fig.update_layout(
                xaxis_tickangle=-45,
                bargap=0.2,
                margin=dict(b=100, l=80, r=80, t=100),
                xaxis_title="Team",
                yaxis_title="Bench Points",
            )

            # Format hover
            fig.update_traces(
                hovertemplate="<b>%{x}</b><br>Bench Points: %{y:.1f}<extra></extra>"
            )
        except Exception as e:
            st.error(f"Error creating chart: {str(e)}")
            st.write(total_bench_pts.head())  # Display sample data for debugging

    elif viz_type == "Scatter Plot":
        # Create absolute values for size parameter
        bench_pts["abs_pts_lost"] = bench_pts["pts_lost"].abs()

        fig = px.scatter(
            bench_pts,
            x="name",
            y="pts_lost",
            color="player_type",
            size="abs_pts_lost",  # Use absolute values for size
            title="Points Lost Distribution",
            hover_data={
                "name": True,
                "player_type": True,
                "pts_lost": True,
                "abs_pts_lost": False,  # Hide this from tooltip
            },
        )

        fig.update_traces(
            marker=dict(
                sizemin=5,  # Minimum marker size
                sizeref=2.0
                * max(bench_pts["abs_pts_lost"])
                / (20.0**2),  # Scale marker sizes
                line=dict(width=1, color="DarkSlateGrey"),  # Marker border
            )
        )

    elif viz_type == "Box Plot":  # Changed from else to elif
        fig = px.box(
            bench_pts,
            x="player_type",
            y="pts_lost",
            color="player_type",
            title="Points Lost Distribution by Position",
            points="all",
        )

    fig.update_layout(height=600, showlegend=True, template="plotly_dark")
    st.plotly_chart(fig, use_container_width=True)

with detail_tab:

    # Filters
    col1, col2 = st.columns([2, 1])
    with col1:
        selected_positions = st.multiselect(
            "Filter by Position", options=bench_pts["player_type"].unique()
        )
    with col2:
        sort_by = st.selectbox("Sort by", options=["pts_lost", "player_type", "team"])

    # Filtered dataframe
    filtered_df = bench_pts
    if selected_positions:
        filtered_df = filtered_df[filtered_df["player_type"].isin(selected_positions)]
    filtered_df = filtered_df.sort_values(sort_by, ascending=False)

    # Display data with download option
    st.dataframe(
        filtered_df.style.background_gradient(cmap="YlOrRd_r", subset=["pts_lost"]),
        hide_index=True,
        use_container_width=True,
    )

    st.download_button(
        "Download Data",
        filtered_df.to_csv(index=False),
        "bench_analysis.csv",
        "text/csv",
        key="download-bench",
    )

# Footer
st.caption("Updated as of GW: " + str(gw))
