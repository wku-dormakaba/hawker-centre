import Head from 'next/head'
import styles from '../styles/Home.module.css'

import axios from 'axios';
import dayjs from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
dayjs.extend(quarterOfYear)
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat)
import isBetween from 'dayjs/plugin/isBetween';
dayjs.extend(isBetween)
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone' // dependent on utc plugin
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault('Asia/Singapore')
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)

const getQuarter = d => {
  const day = dayjs(d, 'D/M/YYYY')
  return `q${day.quarter()}`
}

const isDate = d => d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/) ? true : false;

export default function Home({ closed, upcoming }) {
  return (
    <div className={styles.container}>
      <Head>
        <title>Hawker Centre Availability</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <h2>Closed today ({dayjs.tz().format('DD MMM')})</h2>
        {closed.map(hc => <p key={hc}>{hc}</p>)}
        <hr />
        <h4>Upcoming ...</h4>
        {upcoming.map(hc => <p key={hc}>{hc}</p>)}
      </main>
    </div>
  )
}

export async function getStaticProps() {
  const { data: { result: { records } } } = await axios.get('https://data.gov.sg/api/action/datastore_search?resource_id=b80cb643-a732-480d-86b5-e03957bc82aa');
  const today = dayjs.tz().startOf('day');
  const nextWeek = today.add(1, 'week');

  const q = getQuarter(today.format('D/M/YYYY'))
  const upcoming = []
  const closed = records.map(r => {
    if (isDate(r[`${q}_cleaningstartdate`])) {
      const cleaningstartdate = dayjs(r[`${q}_cleaningstartdate`], 'D/M/YYYY').tz().startOf('day')
      const cleaningenddate = dayjs(r[`${q}_cleaningenddate`], 'D/M/YYYY').tz().endOf('day')
      if (today.isBetween(cleaningstartdate, cleaningenddate, 'day', '[]')) {
        return `${r.name} (${r[`remarks_${q}`] === 'nil' ? `Cleaning, end ${cleaningenddate.format('ddd DD MMM')} ~ ${cleaningenddate.from(today)}` : r[`remarks_${q}`]})`
      }

      if (cleaningstartdate.isAfter(today) && cleaningstartdate.isBefore(nextWeek)) {
        upcoming.push(`${r.name} (${r[`remarks_${q}`] === 'nil' ? `Cleaning, start ${cleaningstartdate.format('ddd DD MMM')} ~ ${cleaningstartdate.from(today)}` : r[`remarks_${q}`]})`)
      }
    }

    if (r.remarks_other_works !== 'nil') {
      const other_works_startdate = dayjs(r.other_works_startdate, 'D/M/YYYY').tz().startOf('day')
      const other_works_enddate = dayjs(r.other_works_enddate, 'D/M/YYYY').tz().endOf('day')
      if (today.isBetween(other_works_startdate, other_works_enddate, 'day', '[]')) {
        return `${r.name} (${r.remarks_other_works}, end ${other_works_enddate.format('ddd DD MMM')} ~ ${other_works_enddate.from(today)})`
      }

      if (other_works_startdate.isAfter(today) && other_works_startdate.isBefore(nextWeek)) {
        upcoming.push(`${r.name} (${r.remarks_other_works}, start ${other_works_startdate.format('ddd DD MMM')} ~ ${other_works_startdate.from(today)})`)
      }
    }

    return false
  }).filter(hc => hc)


  // The value of the `props` key will be
  //  passed to the `Home` component
  return {
    props: { closed, upcoming }
  }
}